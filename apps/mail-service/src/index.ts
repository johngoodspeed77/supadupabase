import {
  createApp,
  Router,
  corsMiddleware,
  jsonResponse,
  errorResponse,
} from '@supadupabase/server';
import { createPool } from '@supadupabase/db';
import { verifyJwt, isAppError } from '@supadupabase/shared';
import { loadConfig, extractBearer } from './config.js';
import { submitTimesheet } from './submit.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const router = new Router();

router.get('/healthz', (ctx) => {
  jsonResponse(ctx, 200, { status: 'ok', service: 'mail-service' });
});

router.get('/mail/healthz', (ctx) => {
  jsonResponse(ctx, 200, { status: 'ok', service: 'mail-service' });
});

router.post('/mail/timesheet/submit', async (ctx) => {
  const token = extractBearer(ctx.headers);
  if (!token) {
    errorResponse(ctx, 401, 'Missing bearer token', 'unauthorized');
    return;
  }

  let userId: string;
  try {
    const payload = verifyJwt(token, config.authSecret, config.jwtIssuer);
    userId = payload.sub;
  } catch {
    errorResponse(ctx, 401, 'Invalid or expired access token', 'invalid_token');
    return;
  }

  const body = ctx.body as { week_start?: string } | null;
  const weekStart = body?.week_start ?? '';

  try {
    const result = await submitTimesheet(pool, config, userId, weekStart);
    jsonResponse(ctx, 200, result);
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      console.error(err);
      errorResponse(ctx, 500, 'Failed to send timesheet email', 'send_failed');
    }
  }
});

const app = createApp({
  router,
  middleware: [corsMiddleware(['*'])],
});

app.listen(config.port, () => {
  console.log(`mail-service listening on http://localhost:${config.port}`);
});
