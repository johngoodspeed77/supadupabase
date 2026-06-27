import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { Router } from './router.js';
import { parseQuery, readJsonBody, errorResponse } from './middleware.js';
import type { Middleware, RequestContext, HttpMethod } from './types.js';
import { AppError, isAppError } from '@supadupabase/shared';

export interface AppOptions {
  router: Router;
  middleware?: Middleware[];
}

export function createApp(options: AppOptions) {
  const { router, middleware = [] } = options;

  const server = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const host = req.headers.host ?? 'localhost';
      const url = new URL(req.url ?? '/', `http://${host}`);
      const method = (req.method ?? 'GET').toUpperCase() as HttpMethod;

      let body: unknown = null;
      if (method !== 'GET' && method !== 'DELETE' && method !== 'OPTIONS') {
        try {
          body = await readJsonBody(req);
        } catch {
          errorResponse(
            { req, res, params: {}, query: {}, body: null, headers: req.headers },
            400,
            'Invalid JSON body',
            'invalid_json',
          );
          return;
        }
      }

      const ctx: RequestContext = {
        req,
        res,
        params: {},
        query: parseQuery(url),
        body,
        headers: req.headers,
      };

      const run = async (index: number): Promise<void> => {
        if (index < middleware.length) {
          await middleware[index](ctx, () => run(index + 1));
          return;
        }

        const matched = router.match(method, url.pathname);
        if (!matched) {
          errorResponse(ctx, 404, 'Not found', 'not_found');
          return;
        }

        ctx.params = matched.params;
        await matched.handler(ctx);
      };

      await run(0);
    } catch (err) {
      const ctx: RequestContext = {
        req,
        res,
        params: {},
        query: {},
        body: null,
        headers: req.headers,
      };
      if (isAppError(err)) {
        errorResponse(ctx, err.status, err.message, err.code);
      } else {
        console.error(err);
        errorResponse(ctx, 500, 'Internal server error', 'internal');
      }
    }
  });

  return server;
}

export { Router } from './router.js';
export * from './middleware.js';
export * from './types.js';
export { AppError };
