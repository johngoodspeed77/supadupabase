import {
  createApp,
  Router,
  corsMiddleware,
  jsonResponse,
  errorResponse,
} from '@supadupabase/server';
import { createPool } from '@supadupabase/db';
import { isAppError, AppError } from '@supadupabase/shared';
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

import {
  requireAdmin,
  listProjects,
  listApiKeys,
  createApiKey,
} from './admin.js';

import {
  listUsers,
  getUserDetail,
  updateUser,
  deleteUser,
  listInvites,
  createInvite,
  revokeInvite,
  previewInvite,
  acceptInvite,
} from './admin-users.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const router = new Router();

router.get('/healthz', (_ctx) => {
  jsonResponse(_ctx, 200, { status: 'ok', service: 'auth-service' });
});

router.get('/auth/healthz', (_ctx) => {
  jsonResponse(_ctx, 200, { status: 'ok', service: 'auth-service' });
});

router.post('/auth/signup', async (ctx) => {
  if (config.inviteOnly) {
    errorResponse(ctx, 403, 'New sign-ups are disabled. Ask your admin for an invite.', 'signup_disabled');
    return;
  }
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
  if (config.inviteOnly) {
    errorResponse(ctx, 403, 'Google sign-in is disabled for new users. Use your invited account.', 'signup_disabled');
    return;
  }
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

router.get('/admin/projects', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    const projects = await listProjects(pool);
    jsonResponse(ctx, 200, { projects });
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.get('/admin/users', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    const users = await listUsers(pool);
    jsonResponse(ctx, 200, { users });
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.post('/admin/users/invite', async (ctx) => {
  try {
    const admin = await requireAdmin(pool, config, ctx.headers);
    const body = ctx.body as { email?: string; project_id?: string } | null;
    const auth = ctx.headers.authorization ?? ctx.headers.Authorization;
    const authHeader = Array.isArray(auth) ? auth[0] : auth ?? '';
    const result = await createInvite(
      pool,
      config,
      body?.email ?? '',
      body?.project_id ?? null,
      admin.id,
      authHeader,
    );
    jsonResponse(ctx, 201, result);
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.get('/admin/users/:id', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    const detail = await getUserDetail(pool, ctx.params.id);
    jsonResponse(ctx, 200, detail);
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.patch('/admin/users/:id', async (ctx) => {
  try {
    const admin = await requireAdmin(pool, config, ctx.headers);
    const body = ctx.body as {
      email_verified?: boolean;
      suspended?: boolean;
      banned_reason?: string | null;
    } | null;
    if (body?.suspended === true && ctx.params.id === admin.id) {
      throw new AppError(400, 'cannot_suspend_self', 'You cannot suspend your own admin account');
    }
    const detail = await updateUser(pool, ctx.params.id, {
      email_verified: body?.email_verified,
      suspended: body?.suspended,
      banned_reason: body?.banned_reason,
    });
    jsonResponse(ctx, 200, detail);
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.delete('/admin/users/:id', async (ctx) => {
  try {
    const admin = await requireAdmin(pool, config, ctx.headers);
    const result = await deleteUser(pool, ctx.params.id, admin.id);
    jsonResponse(ctx, 200, result);
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.get('/admin/invites', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    const invites = await listInvites(pool);
    jsonResponse(ctx, 200, { invites });
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.delete('/admin/invites/:id', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    const result = await revokeInvite(pool, ctx.params.id);
    jsonResponse(ctx, 200, result);
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.get('/auth/invite/:token', async (ctx) => {
  try {
    const preview = await previewInvite(pool, ctx.params.token);
    jsonResponse(ctx, 200, preview);
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.post('/auth/invite/accept', async (ctx) => {
  try {
    const body = ctx.body as { token?: string; password?: string } | null;
    const session = await acceptInvite(pool, config, body?.token ?? '', body?.password ?? '');
    jsonResponse(ctx, 201, session);
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.get('/admin/api-keys', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    const keys = await listApiKeys(pool);
    jsonResponse(ctx, 200, { keys });
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

router.post('/auth/api-keys', async (ctx) => {
  try {
    await requireAdmin(pool, config, ctx.headers);
    const body = ctx.body as {
      project_id?: string;
      name?: string;
      role?: 'anon' | 'service_role';
    } | null;
    const key = await createApiKey(
      pool,
      body?.project_id ?? '00000000-0000-0000-0000-000000000001',
      body?.name ?? 'API Key',
      body?.role ?? 'anon',
    );
    jsonResponse(ctx, 201, key);
  } catch (err) {
    if (isAppError(err)) errorResponse(ctx, err.status, err.message, err.code);
    else throw err;
  }
});

const app = createApp({
  router,
  middleware: [corsMiddleware(['*'])],
});

app.listen(config.port, () => {
  console.log(`auth-service listening on http://localhost:${config.port}`);
});
