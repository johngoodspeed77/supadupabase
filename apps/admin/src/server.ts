import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const uiDir = join(rootDir, '..', '..', 'packages', 'ui');
const port = Number(process.env.ADMIN_PORT ?? 3003);

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function resolveFile(pathname: string): Promise<{ filePath: string; contentType: string } | null> {
  if (pathname === '/' || pathname === '/index.html') {
    return { filePath: join(rootDir, 'index.html'), contentType: mime['.html'] };
  }
  if (pathname.startsWith('/ui/')) {
    const rel = pathname.slice(4);
    const filePath = join(uiDir, rel);
    const ext = extname(filePath);
    return { filePath, contentType: mime[ext] ?? 'application/octet-stream' };
  }
  if (pathname === '/app.js') {
    return { filePath: join(rootDir, 'app.js'), contentType: mime['.js'] };
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
    if (
      resolved.contentType.includes('html') ||
      resolved.contentType.includes('javascript') ||
      resolved.contentType.includes('css')
    ) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    res.end(content);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

server.listen(port, () => {
  console.log(`admin UI at http://localhost:${port}`);
});
