import { createHash, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createApp, Router, jsonResponse, errorResponse } from '@supadupabase/server';

const secret = process.env.DEPLOY_HOOK_SECRET ?? '';
const repoRoot = process.env.REPO_ROOT ?? '/repo';
const deployScript = process.env.DEPLOY_SCRIPT ?? 'infra/deploy-quick.sh';
const port = Number(process.env.DEPLOY_HOOK_PORT ?? 3005);

let deploying = false;

function verifyAuth(headers: Record<string, string | string[] | undefined>): boolean {
  if (!secret) return false;
  const auth = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value?.startsWith('Bearer ')) return false;
  const token = value.slice(7);
  const a = createHash('sha256').update(token).digest();
  const b = createHash('sha256').update(secret).digest();
  return timingSafeEqual(a, b);
}

function runDeploy(services?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (services?.trim()) {
      env.DEPLOY_SERVICES = services.trim();
    }

    const child = spawn('bash', [deployScript], {
      cwd: repoRoot,
      env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function tail(text: string, max = 12000): string {
  if (text.length <= max) return text;
  return `…${text.slice(-max)}`;
}

const router = new Router();

router.get('/hooks/healthz', (_ctx) => {
  jsonResponse(_ctx, 200, {
    status: 'ok',
    service: 'deploy-hook',
    enabled: Boolean(secret),
    deploying,
  });
});

router.post('/hooks/deploy', async (ctx) => {
  if (!secret) {
    errorResponse(ctx, 503, 'DEPLOY_HOOK_SECRET is not configured', 'deploy_disabled');
    return;
  }
  if (!verifyAuth(ctx.headers)) {
    errorResponse(ctx, 401, 'Unauthorized', 'unauthorized');
    return;
  }
  if (deploying) {
    errorResponse(ctx, 409, 'Deploy already in progress', 'deploy_busy');
    return;
  }

  const body = ctx.body as { services?: string; migrate?: boolean } | null;
  const started = new Date().toISOString();
  deploying = true;
  console.log(`[deploy-hook] deploy started at ${started}`);

  // Respond before docker rebuild — Cloudflare tunnel times out on long requests.
  jsonResponse(ctx, 202, {
    ok: true,
    accepted: true,
    started,
    message: 'Deploy started in background',
  });

  void (async () => {
    if (body?.migrate) {
      process.env.DEPLOY_MIGRATE = '1';
    }
    try {
      const result = await runDeploy(body?.services);
      console.log(`[deploy-hook] deploy finished code=${result.code}`);
      if (result.code !== 0) {
        console.error('[deploy-hook] deploy stderr tail:', tail(result.stderr));
      }
    } catch (err) {
      console.error('[deploy-hook] deploy failed', err);
    } finally {
      deploying = false;
      delete process.env.DEPLOY_MIGRATE;
    }
  })();
});

if (!secret) {
  console.warn('deploy-hook: DEPLOY_HOOK_SECRET is not set — POST /hooks/deploy is disabled');
}

const app = createApp({ router });

app.listen(port, () => {
  console.log(`deploy-hook listening on http://localhost:${port}`);
});
