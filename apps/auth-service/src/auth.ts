import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
  hashToken,
  type AuthSession,
  AppError,
} from '@supadupabase/shared';
import type { Config } from './config.js';

const ACCESS_TTL = 3600;
const REFRESH_TTL_DAYS = 30;

interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  created_at: string;
}

function refreshExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TTL_DAYS);
  return d;
}

function newRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

function toAuthUser(row: DbUser) {
  return { id: row.id, email: row.email, created_at: row.created_at };
}

async function createSession(
  pool: pg.Pool,
  config: Config,
  user: DbUser,
): Promise<AuthSession> {
  const refreshToken = newRefreshToken();
  const refreshHash = hashToken(refreshToken);

  await pool.query(
    `INSERT INTO auth.sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, refreshHash, refreshExpiry()],
  );

  const accessToken = signJwt(
    { sub: user.id, email: user.email, role: 'authenticated' },
    config.authSecret,
    { expiresInSeconds: ACCESS_TTL, issuer: config.jwtIssuer },
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TTL,
    token_type: 'bearer',
    user: toAuthUser(user),
  };
}

export async function signup(
  pool: pg.Pool,
  config: Config,
  email: string,
  password: string,
): Promise<AuthSession> {
  if (!email || !password || password.length < 8) {
    throw new AppError(400, 'validation_error', 'Email and password (min 8 chars) required');
  }

  const passwordHash = hashPassword(password);
  const result = await pool.query<DbUser>(
    `INSERT INTO auth.users (email, password_hash, email_verified)
     VALUES ($1, $2, false)
     RETURNING id, email, password_hash, created_at`,
    [email.toLowerCase(), passwordHash],
  );

  return createSession(pool, config, result.rows[0]);
}

export async function login(
  pool: pg.Pool,
  config: Config,
  email: string,
  password: string,
): Promise<AuthSession> {
  const result = await pool.query<DbUser>(
    `SELECT id, email, password_hash, created_at FROM auth.users WHERE email = $1`,
    [email.toLowerCase()],
  );
  const user = result.rows[0];
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
    throw new AppError(401, 'invalid_credentials', 'Invalid email or password');
  }
  return createSession(pool, config, user);
}

export async function logout(pool: pg.Pool, refreshToken: string): Promise<void> {
  const refreshHash = hashToken(refreshToken);
  await pool.query(`DELETE FROM auth.sessions WHERE refresh_token_hash = $1`, [refreshHash]);
}

export async function refresh(
  pool: pg.Pool,
  config: Config,
  refreshToken: string,
): Promise<AuthSession> {
  const refreshHash = hashToken(refreshToken);
  const result = await pool.query<DbUser & { session_id: string }>(
    `SELECT u.id, u.email, u.password_hash, u.created_at, s.id AS session_id
     FROM auth.sessions s
     JOIN auth.users u ON u.id = s.user_id
     WHERE s.refresh_token_hash = $1 AND s.expires_at > NOW()`,
    [refreshHash],
  );
  const row = result.rows[0];
  if (!row) {
    throw new AppError(401, 'invalid_refresh', 'Invalid or expired refresh token');
  }

  await pool.query(`DELETE FROM auth.sessions WHERE id = $1`, [row.session_id]);
  return createSession(pool, config, row);
}

export async function me(pool: pg.Pool, config: Config, accessToken: string) {
  let payload;
  try {
    payload = verifyJwt(accessToken, config.authSecret, config.jwtIssuer);
  } catch {
    throw new AppError(401, 'invalid_token', 'Invalid or expired access token');
  }

  const result = await pool.query<DbUser>(
    `SELECT id, email, password_hash, created_at FROM auth.users WHERE id = $1`,
    [payload.sub],
  );
  const user = result.rows[0];
  if (!user) {
    throw new AppError(401, 'user_not_found', 'User not found');
  }
  return { user: toAuthUser(user) };
}

export async function createOAuthState(
  pool: pg.Pool,
  redirectTo: string | null,
): Promise<string> {
  const state = randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    `INSERT INTO auth.oauth_states (state, redirect_to, expires_at) VALUES ($1, $2, $3)`,
    [state, redirectTo, expires],
  );
  return state;
}

export async function consumeOAuthState(
  pool: pg.Pool,
  state: string,
): Promise<{ ok: boolean; redirectTo: string | null }> {
  const result = await pool.query<{ redirect_to: string | null }>(
    `DELETE FROM auth.oauth_states
     WHERE state = $1 AND expires_at > NOW()
     RETURNING redirect_to`,
    [state],
  );
  if (!result.rows[0]) {
    return { ok: false, redirectTo: null };
  }
  return { ok: true, redirectTo: result.rows[0].redirect_to };
}

export function googleAuthUrl(config: Config, state: string): string {
  const redirectUri = `${config.publicUrl}/auth/callback/google`;
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGoogleCallback(
  pool: pg.Pool,
  config: Config,
  code: string,
): Promise<AuthSession> {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new AppError(503, 'oauth_not_configured', 'Google OAuth is not configured');
  }

  const redirectUri = `${config.publicUrl}/auth/callback/google`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    throw new AppError(401, 'oauth_exchange_failed', 'Failed to exchange Google authorization code');
  }

  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw new AppError(401, 'oauth_exchange_failed', 'No access token from Google');
  }

  const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userInfoRes.ok) {
    throw new AppError(401, 'oauth_userinfo_failed', 'Failed to fetch Google user info');
  }

  const info = (await userInfoRes.json()) as { sub?: string; email?: string };
  if (!info.sub || !info.email) {
    throw new AppError(401, 'oauth_userinfo_failed', 'Incomplete Google user info');
  }

  const existing = await pool.query<DbUser>(
    `SELECT id, email, password_hash, created_at FROM auth.users WHERE email = $1 OR google_id = $2`,
    [info.email.toLowerCase(), info.sub],
  );

  let user = existing.rows[0];
  if (user) {
    await pool.query(
      `UPDATE auth.users SET google_id = COALESCE(google_id, $1), email_verified = true, updated_at = NOW() WHERE id = $2`,
      [info.sub, user.id],
    );
  } else {
    const inserted = await pool.query<DbUser>(
      `INSERT INTO auth.users (email, google_id, email_verified)
       VALUES ($1, $2, true)
       RETURNING id, email, password_hash, created_at`,
      [info.email.toLowerCase(), info.sub],
    );
    user = inserted.rows[0];
  }

  return createSession(pool, config, user);
}

export function bearerToken(headers: Record<string, string | string[] | undefined>): string | null {
  const auth = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice(7);
}
