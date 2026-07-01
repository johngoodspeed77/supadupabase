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

export type { DbUser };

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

export async function createSession(
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
  let result;
  try {
    result = await pool.query<DbUser>(
      `INSERT INTO auth.users (email, password_hash, email_verified)
       VALUES ($1, $2, false)
       RETURNING id, email, password_hash, created_at`,
      [email.toLowerCase(), passwordHash],
    );
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw new AppError(
        409,
        'email_exists',
        'An account with this email already exists. Sign in instead.',
      );
    }
    throw err;
  }

  const user = result.rows[0];
  await pool.query(
    `INSERT INTO public.profiles (id, project_id, display_name)
     VALUES ($1, '00000000-0000-0000-0000-000000000001', $2)
     ON CONFLICT (id, project_id) DO NOTHING`,
    [user.id, email.split('@')[0]],
  );

  return createSession(pool, config, user);
}

export async function login(
  pool: pg.Pool,
  config: Config,
  email: string,
  password: string,
): Promise<AuthSession> {
  const result = await pool.query<DbUser & { banned_at: string | null }>(
    `SELECT id, email, password_hash, created_at, banned_at FROM auth.users WHERE email = $1`,
    [email.toLowerCase()],
  );
  const user = result.rows[0];
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
    throw new AppError(401, 'invalid_credentials', 'Invalid email or password');
  }
  if (user.banned_at) {
    throw new AppError(403, 'account_suspended', 'This account has been suspended');
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
  const result = await pool.query<DbUser & { session_id: string; banned_at: string | null }>(
    `SELECT u.id, u.email, u.password_hash, u.created_at, u.banned_at, s.id AS session_id
     FROM auth.sessions s
     JOIN auth.users u ON u.id = s.user_id
     WHERE s.refresh_token_hash = $1 AND s.expires_at > NOW()`,
    [refreshHash],
  );
  const row = result.rows[0];
  if (!row) {
    throw new AppError(401, 'invalid_refresh', 'Invalid or expired refresh token');
  }
  if (row.banned_at) {
    await pool.query(`DELETE FROM auth.sessions WHERE user_id = $1`, [row.id]);
    throw new AppError(403, 'account_suspended', 'This account has been suspended');
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

  const result = await pool.query<DbUser & { banned_at: string | null }>(
    `SELECT id, email, password_hash, created_at, banned_at FROM auth.users WHERE id = $1`,
    [payload.sub],
  );
  const user = result.rows[0];
  if (!user) {
    throw new AppError(401, 'user_not_found', 'User not found');
  }
  if (user.banned_at) {
    throw new AppError(403, 'account_suspended', 'This account has been suspended');
  }
  return { user: toAuthUser(user) };
}

export function bearerToken(headers: Record<string, string | string[] | undefined>): string | null {
  const auth = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice(7);
}
