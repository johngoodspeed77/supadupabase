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
import { requireAdmin } from './admin.js';
import { submitTimesheet } from './submit.js';
import { sendTestEmail, smtpStatus } from './test.js';
import {
  vapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  removeAllPushSubscriptions,
  type PushSubscriptionInput,
} from './push.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const router = new Router();

router.get('/healthz', (ctx) => {
  jsonResponse(ctx, 200, { status: 'ok', service: 'mail-service' });
});

router.get('/mail/healthz', (ctx) => {
  jsonResponse(ctx, 200, { status: 'ok', service: 'mail-service' });
});

router.get('/admin/mail/status', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    jsonResponse(ctx, 200, smtpStatus(config));
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      throw err;
    }
  }
});

router.post('/admin/mail/test', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    const body = ctx.body as { to?: string } | null;
    const result = await sendTestEmail(config, body?.to ?? '');
    jsonResponse(ctx, 200, result);
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      console.error(err);
      errorResponse(ctx, 500, 'Failed to send test email', 'send_failed');
    }
  }
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

router.get('/mail/push/vapid-public-key', (ctx) => {
  const key = vapidPublicKey(config);
  if (!key) {
    errorResponse(ctx, 503, 'Web Push is not configured', 'push_not_configured');
    return;
  }
  jsonResponse(ctx, 200, { publicKey: key });
});

router.post('/mail/push/subscribe', async (ctx) => {
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

  const body = ctx.body as { subscription?: PushSubscriptionInput } | null;
  if (!body?.subscription) {
    errorResponse(ctx, 400, 'subscription is required', 'validation_error');
    return;
  }

  try {
    await savePushSubscription(pool, userId, body.subscription);
    jsonResponse(ctx, 200, { ok: true });
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      console.error(err);
      errorResponse(ctx, 500, 'Failed to save push subscription', 'push_failed');
    }
  }
});

router.post('/mail/push/unsubscribe', async (ctx) => {
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

  const body = ctx.body as { endpoint?: string; all?: boolean } | null;
  try {
    if (body?.all) {
      await removeAllPushSubscriptions(pool, userId);
    } else {
      await removePushSubscription(pool, userId, body?.endpoint ?? '');
    }
    jsonResponse(ctx, 200, { ok: true });
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      console.error(err);
      errorResponse(ctx, 500, 'Failed to remove push subscription', 'push_failed');
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
