import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const services = [
  { name: 'auth', script: 'dev:auth' },
  { name: 'data', script: 'dev:data' },
  { name: 'admin', script: 'dev:admin' },
  { name: 'sample', script: 'dev:sample' },
];

const children = services.map(({ name, script }) => {
  const child = spawn(npm, ['run', script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[${name}] exited with ${code}`);
  });
  return child;
});

function shutdown() {
  for (const child of children) child.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('SupaDupaBase dev: auth :3001, data :3002, admin :3003, sample :5173');
