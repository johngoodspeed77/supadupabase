import type { IncomingMessage } from 'node:http';
import type { RequestContext, Middleware } from './types.js';

export function parseQuery(url: URL): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }
  return query;
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return null;
  return JSON.parse(raw) as unknown;
}

export function corsMiddleware(allowedOrigins: string[] = ['*']): Middleware {
  return async (ctx, next) => {
    const origin = String(ctx.headers.origin ?? '');
    const allowAll = allowedOrigins.includes('*');
    const allowed = allowAll || (origin && allowedOrigins.includes(origin));

    if (allowed) {
      ctx.res.setHeader('Access-Control-Allow-Origin', allowAll ? '*' : origin);
      ctx.res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      ctx.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
      ctx.res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (ctx.req.method === 'OPTIONS') {
      ctx.res.statusCode = 204;
      ctx.res.end();
      return;
    }

    await next();
  };
}

export function jsonResponse(ctx: RequestContext, status: number, data: unknown): void {
  ctx.res.statusCode = status;
  ctx.res.setHeader('Content-Type', 'application/json; charset=utf-8');
  ctx.res.end(JSON.stringify(data));
}

export function errorResponse(ctx: RequestContext, status: number, message: string, code = 'error'): void {
  jsonResponse(ctx, status, { error: code, message, status });
}
