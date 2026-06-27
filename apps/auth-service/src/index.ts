import {
  createApp,
  Router,
  corsMiddleware,
  jsonResponse,
  errorResponse,
} from '@supadupabase/server';
import { createPool } from '@supadupabase/db';
import { isAppError } from '@supadupabase/shared';
import { loadConfig } from './config.js';
import {
  signup,
  login,
  logout,
  refresh,
  me,
  createOAuthState,
  consumeOAuthState,
  googleAuthUrl,
  handleGoogleCallback,
  bearerToken,
} from './auth.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const router = new Router();

router.get('/healthz', (_ctx) => {
  jsonResponse(_ctx, 200, { status: 'ok', service: 'auth-service' });
});

router.post('/auth/signup', async (ctx) => {
  const body = ctx.body as { email?: string; password?: string } | null;
  const session = await signup(pool, config, body?.email ?? '', body?.password ?? '');
  jsonResponse(ctx, 201, session);
});

router.post('/auth/login', async (ctx) => {
  const body = ctx.body as { email?: string; password?: string } | null;
  const session = await login(pool, config, body?.email ?? '', body?.password ?? '');
  jsonResponse(ctx, 200, session);
});

router.post('/auth/logout', async (ctx) => {
  const body = ctx.body as { refresh_token?: string } | null;
  const token = body?.refresh_token;
  if (token) await logout(pool, token);
  jsonResponse(ctx, 200, { ok: true });
});

router.post('/auth/refresh', async (ctx) => {
  const body = ctx.body as { refresh_token?: string } | null;
  const session = await refresh(pool, config, body?.refresh_token ?? '');
  jsonResponse(ctx, 200, session);
});

router.get('/auth/me', async (ctx) => {
  const token = bearerToken(ctx.headers);
  if (!token) {
    errorResponse(ctx, 401, 'Missing bearer token', 'unauthorized');
    return;
  }
  const result = await me(pool, config, token);
  jsonResponse(ctx, 200, result);
});

router.get('/auth/signin/google', async (ctx) => {
  if (!config.googleClientId) {
    errorResponse(ctx, 503, 'Google OAuth is not configured', 'oauth_not_configured');
    return;
  }
  const redirectTo = ctx.query.redirect_to ?? null;
  const state = await createOAuthState(pool, redirectTo);
  const url = googleAuthUrl(config, state);
  ctx.res.statusCode = 302;
  ctx.res.setHeader('Location', url);
  ctx.res.end();
});

router.get('/auth/callback/google', async (ctx) => {
  const code = ctx.query.code;
  const state = ctx.query.state;
  const oauthError = ctx.query.error;

  if (oauthError) {
    errorResponse(ctx, 401, String(oauthError), 'oauth_denied');
    return;
  }
  if (!code || !state) {
    errorResponse(ctx, 400, 'Missing code or state', 'validation_error');
    return;
  }

  const oauthState = await consumeOAuthState(pool, state);
  if (!oauthState.ok) {
    errorResponse(ctx, 400, 'Invalid or expired OAuth state', 'invalid_state');
    return;
  }

  try {
    const session = await handleGoogleCallback(pool, config, code);
    if (oauthState.redirectTo) {
      const target = new URL(oauthState.redirectTo);
      target.searchParams.set('access_token', session.access_token);
      target.searchParams.set('refresh_token', session.refresh_token);
      ctx.res.statusCode = 302;
      ctx.res.setHeader('Location', target.toString());
      ctx.res.end();
      return;
    }
    jsonResponse(ctx, 200, session);
  } catch (err) {
    if (isAppError(err)) {
      errorResponse(ctx, err.status, err.message, err.code);
    } else {
      throw err;
    }
  }
});

const app = createApp({
  router,
  middleware: [corsMiddleware(['*'])],
});

app.listen(config.port, () => {
  console.log(`auth-service listening on http://localhost:${config.port}`);
});
