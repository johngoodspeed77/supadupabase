import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sdkDir = join(rootDir, '..', '..', 'packages', 'sdk', 'dist');
const port = Number(process.env.SAMPLE_PORT ?? 5173);

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

async function resolveFile(pathname: string): Promise<{ filePath: string; contentType: string } | null> {
  if (pathname === '/' || pathname === '/index.html') {
    return { filePath: join(rootDir, 'index.html'), contentType: mime['.html'] };
  }
  if (pathname === '/app.js') {
    return { filePath: join(rootDir, 'app.js'), contentType: mime['.js'] };
  }
  if (pathname === '/styles.css') {
    return { filePath: join(rootDir, 'styles.css'), contentType: mime['.css'] };
  }
  if (pathname === '/manifest.webmanifest') {
    return { filePath: join(rootDir, 'manifest.webmanifest'), contentType: mime['.webmanifest'] };
  }
  if (pathname.startsWith('/sdk/')) {
    const rel = pathname.slice(5);
    const filePath = join(sdkDir, rel);
    const ext = extname(filePath);
    return { filePath, contentType: mime[ext] ?? 'text/javascript; charset=utf-8' };
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = normalize(url.pathname);
    if (pathname.includes('..')) {
      res.statusCode = 400;
      res.end('Bad request');
      return;
    }

    const resolved = await resolveFile(pathname);
    if (!resolved) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const content = await readFile(resolved.filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', resolved.contentType);
    res.end(content);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

server.listen(port, () => {
  console.log(`sample PWA at http://localhost:${port}`);
});
