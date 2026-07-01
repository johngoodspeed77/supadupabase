#!/usr/bin/env node
/**
 * Trigger a remote deploy on VM106 / VM101 via HTTPS deploy webhook.
 *
 * Usage:
 *   DEPLOY_HOOK_SECRET=... npm run deploy:remote
 *   DEPLOY_HOOK_SECRET=... node scripts/remote-deploy.mjs --target both --migrate
 *
 * Optional env (see .env.remote.example):
 *   DEPLOY_WEBHOOK_URL_VM106  default https://supadupabase.whitelynx.co.nz/hooks/deploy
 *   DEPLOY_WEBHOOK_URL_VM101  default https://timesheet.whitelynx.co.nz/hooks/deploy
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(join(root, '.env.remote'));

const args = process.argv.slice(2);
function flag(name) {
  return args.includes(name);
}
function option(name, fallback = '') {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return fallback;
  return args[i + 1];
}

const target = option('--target', 'supadupabase');
const services = option('--services', '');
const migrate = flag('--migrate');
const secret = process.env.DEPLOY_HOOK_SECRET;

if (!secret) {
  console.error('Set DEPLOY_HOOK_SECRET (env or .env.remote)');
  process.exit(1);
}

const targets = {
  supadupabase: {
    url:
      process.env.DEPLOY_WEBHOOK_URL_VM106 ??
      'https://supadupabase.whitelynx.co.nz/hooks/deploy',
    body: {
      services: services || 'auth-service data-api mail-service admin caddy',
      migrate,
    },
  },
  timesheet: {
    url:
      process.env.DEPLOY_WEBHOOK_URL_VM101 ??
      'https://timesheet.whitelynx.co.nz/hooks/deploy',
    body: {},
  },
};

const order =
  target === 'both'
    ? ['supadupabase', 'timesheet']
    : target === 'timesheet'
      ? ['timesheet']
      : ['supadupabase'];

async function deployOne(name) {
  const cfg = targets[name];
  console.log(`\n==> Deploy ${name}: POST ${cfg.url}`);
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(cfg.body),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    console.error(JSON.stringify(body, null, 2));
    throw new Error(`${name} deploy failed: HTTP ${res.status}`);
  }
  console.log(JSON.stringify(body, null, 2));
}

for (const name of order) {
  await deployOne(name);
}

console.log('\nRemote deploy finished.');
