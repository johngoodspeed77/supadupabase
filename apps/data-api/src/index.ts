import {
  createApp,
  Router,
  corsMiddleware,
  jsonResponse,
  errorResponse,
} from '@supadupabase/server';
import { createPool, withJwtContext } from '@supadupabase/db';
import { isAppError } from '@supadupabase/shared';
import { loadConfig, extractBearer, verifyAccessToken } from './config.js';
import { insertRows, selectRows, updateRows, deleteRows } from './query.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const router = new Router();

router.get('/healthz', (ctx) => {
  jsonResponse(ctx, 200, { status: 'ok', service: 'data-api' });
});

router.get('/rest/v1/:table', async (ctx) => {
  const token = extractBearer(ctx.headers);
  if (!token) {
    errorResponse(ctx, 401, 'Missing bearer token', 'unauthorized');
    return;
  }

  let userId: string;
  try {
    userId = verifyAccessToken(config, token).sub;
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
      return;
    }
    throw err;
  }

  try {
    const rows = await withJwtContext(pool, userId, (client) =>
      selectRows(client, ctx.params.table, ctx.query),
    );
    jsonResponse(ctx, 200, rows);
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      throw err;
    }
  }
});

router.post('/rest/v1/:table', async (ctx) => {
  const token = extractBearer(ctx.headers);
  if (!token) {
    errorResponse(ctx, 401, 'Missing bearer token', 'unauthorized');
    return;
  }

  let userId: string;
  try {
    userId = verifyAccessToken(config, token).sub;
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
      return;
    }
    throw err;
  }

  try {
    const rows = await withJwtContext(pool, userId, (client) =>
      insertRows(client, ctx.params.table, ctx.body),
    );
    jsonResponse(ctx, 201, rows.length === 1 ? rows[0] : rows);
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      throw err;
    }
  }
});

router.patch('/rest/v1/:table', async (ctx) => {
  const token = extractBearer(ctx.headers);
  if (!token) {
    errorResponse(ctx, 401, 'Missing bearer token', 'unauthorized');
    return;
  }

  let userId: string;
  try {
    userId = verifyAccessToken(config, token).sub;
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
      return;
    }
    throw err;
  }

  try {
    const rows = await withJwtContext(pool, userId, (client) =>
      updateRows(client, ctx.params.table, ctx.body, ctx.query),
    );
    jsonResponse(ctx, 200, rows.length === 1 ? rows[0] : rows);
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      throw err;
    }
  }
});

router.delete('/rest/v1/:table', async (ctx) => {
  const token = extractBearer(ctx.headers);
  if (!token) {
    errorResponse(ctx, 401, 'Missing bearer token', 'unauthorized');
    return;
  }

  let userId: string;
  try {
    userId = verifyAccessToken(config, token).sub;
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
      return;
    }
    throw err;
  }

  try {
    const rows = await withJwtContext(pool, userId, (client) =>
      deleteRows(client, ctx.params.table, ctx.query),
    );
    jsonResponse(ctx, 200, rows);
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      throw err;
    }
  }
});

router.post('/rest/v1/rpc/:function', (ctx) => {
  errorResponse(ctx, 501, 'RPC not implemented yet', 'not_implemented');
});

const app = createApp({
  router,
  middleware: [corsMiddleware(['*'])],
});

app.listen(config.port, () => {
  console.log(`data-api listening on http://localhost:${config.port}`);
});
