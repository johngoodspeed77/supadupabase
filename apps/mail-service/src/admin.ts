import type pg from 'pg';
import { verifyJwt, AppError } from '@supadupabase/shared';
import type { MailServiceConfig } from './config.js';
import { extractBearer } from './config.js';

export function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function requireAdmin(
  pool: pg.Pool,
  config: MailServiceConfig,
  headers: Record<string, string | string[] | undefined>,
): Promise<{ id: string; email: string }> {
  const token = extractBearer(headers);
  if (!token) {
    throw new AppError(401, 'unauthorized', 'Missing bearer token');
  }

  let userId: string;
  try {
    userId = verifyJwt(token, config.authSecret, config.jwtIssuer).sub;
  } catch {
    throw new AppError(401, 'invalid_token', 'Invalid or expired access token');
  }

  const result = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM auth.users WHERE id = $1`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) {
    throw new AppError(401, 'unauthorized', 'User not found');
  }

  const admins = parseAdminEmails();
  if (!admins.size) {
    throw new AppError(503, 'admin_not_configured', 'ADMIN_EMAILS is not configured');
  }
  if (!admins.has(user.email.toLowerCase())) {
    throw new AppError(403, 'forbidden', 'Admin access required');
  }

  return user;
}
