import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import { hashPassword, hashToken, AppError } from '@supadupabase/shared';
import type { Config } from './config.js';
import { createSession, type DbUser } from './auth.js';

const INVITE_TTL_DAYS = 7;

export interface UserListRow {
  id: string;
  email: string;
  email_verified: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
  updated_at: string;
  active_sessions: number;
  project_slugs: string[];
}

export interface InviteRow {
  id: string;
  email: string;
  project_id: string | null;
  project_name: string | null;
  invited_by_email: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

function inviteExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_TTL_DAYS);
  return d;
}

function newInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

async function getUserRow(pool: pg.Pool, userId: string): Promise<DbUser & { banned_at: string | null }> {
  const result = await pool.query<DbUser & { banned_at: string | null; banned_reason: string | null }>(
    `SELECT id, email, password_hash, created_at, banned_at, banned_reason
     FROM auth.users WHERE id = $1`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) throw new AppError(404, 'not_found', 'User not found');
  return user;
}

export async function assertUserActive(pool: pg.Pool, userId: string): Promise<void> {
  const result = await pool.query<{ banned_at: string | null }>(
    `SELECT banned_at FROM auth.users WHERE id = $1`,
    [userId],
  );
  if (result.rows[0]?.banned_at) {
    throw new AppError(403, 'account_suspended', 'This account has been suspended');
  }
}

export async function listUsers(pool: pg.Pool): Promise<UserListRow[]> {
  const result = await pool.query<UserListRow>(
    `SELECT
       u.id,
       u.email,
       u.email_verified,
       u.banned_at,
       u.banned_reason,
       u.created_at,
       u.updated_at,
       (SELECT COUNT(*)::int FROM auth.sessions s WHERE s.user_id = u.id AND s.expires_at > NOW()) AS active_sessions,
       COALESCE(
         (SELECT array_agg(DISTINCT p.slug ORDER BY p.slug)
          FROM public.profiles pr
          JOIN public.projects p ON p.id = pr.project_id
          WHERE pr.id = u.id),
         '{}'
       ) AS project_slugs
     FROM auth.users u
     ORDER BY u.created_at DESC
     LIMIT 500`,
  );
  return result.rows;
}

export async function getUserDetail(pool: pg.Pool, userId: string) {
  const user = await pool.query(
    `SELECT id, email, email_verified, banned_at, banned_reason, created_at, updated_at
     FROM auth.users WHERE id = $1`,
    [userId],
  );
  if (!user.rows[0]) throw new AppError(404, 'not_found', 'User not found');

  const profiles = await pool.query(
    `SELECT p.slug AS project_slug, p.name AS project_name, pr.display_name, pr.avatar_url, pr.created_at
     FROM public.profiles pr
     JOIN public.projects p ON p.id = pr.project_id
     WHERE pr.id = $1
     ORDER BY pr.created_at`,
    [userId],
  );

  const settings = await pool.query(
    `SELECT boss_email, employee_name, weekly_reminder_enabled, default_start_time, created_at, updated_at
     FROM public.user_settings WHERE user_id = $1`,
    [userId],
  );

  const counts = await pool.query<{
    time_entries: number;
    week_submissions: number;
    push_subscriptions: number;
    active_sessions: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM public.time_entries WHERE user_id = $1) AS time_entries,
       (SELECT COUNT(*)::int FROM public.week_submissions WHERE user_id = $1) AS week_submissions,
       (SELECT COUNT(*)::int FROM public.push_subscriptions WHERE user_id = $1) AS push_subscriptions,
       (SELECT COUNT(*)::int FROM auth.sessions WHERE user_id = $1 AND expires_at > NOW()) AS active_sessions`,
    [userId],
  );

  const lastSession = await pool.query<{ last_seen: string | null }>(
    `SELECT MAX(created_at) AS last_seen FROM auth.sessions WHERE user_id = $1`,
    [userId],
  );

  return {
    user: user.rows[0],
    profiles: profiles.rows,
    settings: settings.rows[0] ?? null,
    counts: counts.rows[0],
    last_session_at: lastSession.rows[0]?.last_seen ?? null,
  };
}

export async function updateUser(
  pool: pg.Pool,
  userId: string,
  patch: { email_verified?: boolean; suspended?: boolean; banned_reason?: string | null },
) {
  await getUserRow(pool, userId);

  const sets: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let i = 1;

  if (patch.email_verified !== undefined) {
    sets.push(`email_verified = $${i++}`);
    values.push(patch.email_verified);
  }

  if (patch.suspended !== undefined) {
    if (patch.suspended) {
      sets.push(`banned_at = NOW()`);
      if (patch.banned_reason !== undefined) {
        sets.push(`banned_reason = $${i++}`);
        values.push(patch.banned_reason);
      }
      await pool.query(`DELETE FROM auth.sessions WHERE user_id = $1`, [userId]);
    } else {
      sets.push(`banned_at = NULL`, `banned_reason = NULL`);
    }
  } else if (patch.banned_reason !== undefined) {
    sets.push(`banned_reason = $${i++}`);
    values.push(patch.banned_reason);
  }

  values.push(userId);
  await pool.query(`UPDATE auth.users SET ${sets.join(', ')} WHERE id = $${i}`, values);

  return getUserDetail(pool, userId);
}

export async function deleteUser(pool: pg.Pool, userId: string, actorId: string) {
  if (userId === actorId) {
    throw new AppError(400, 'cannot_delete_self', 'You cannot delete your own admin account');
  }
  const result = await pool.query(`DELETE FROM auth.users WHERE id = $1 RETURNING email`, [userId]);
  if (!result.rows[0]) throw new AppError(404, 'not_found', 'User not found');
  return { deleted: true, email: result.rows[0].email as string };
}

export async function listInvites(pool: pg.Pool): Promise<InviteRow[]> {
  const result = await pool.query<InviteRow>(
    `SELECT
       i.id,
       i.email,
       i.project_id,
       p.name AS project_name,
       u.email AS invited_by_email,
       i.expires_at,
       i.accepted_at,
       i.created_at
     FROM auth.invites i
     LEFT JOIN public.projects p ON p.id = i.project_id
     LEFT JOIN auth.users u ON u.id = i.invited_by
     WHERE i.accepted_at IS NULL AND i.expires_at > NOW()
     ORDER BY i.created_at DESC
     LIMIT 100`,
  );
  return result.rows;
}

export async function revokeInvite(pool: pg.Pool, inviteId: string) {
  const result = await pool.query(`DELETE FROM auth.invites WHERE id = $1 AND accepted_at IS NULL RETURNING id`, [
    inviteId,
  ]);
  if (!result.rows[0]) throw new AppError(404, 'not_found', 'Invite not found or already accepted');
  return { revoked: true };
}

export async function createInvite(
  pool: pg.Pool,
  config: Config,
  email: string,
  projectId: string | null,
  invitedBy: string,
  mailAuthHeader: string,
): Promise<{ invite: InviteRow; invite_url: string; email_sent: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError(400, 'validation_error', 'A valid email is required');
  }

  const existing = await pool.query(`SELECT id FROM auth.users WHERE email = $1`, [normalized]);
  if (existing.rows[0]) {
    throw new AppError(409, 'user_exists', 'A user with this email already exists');
  }

  let resolvedProjectId = projectId;
  if (resolvedProjectId) {
    const project = await pool.query(`SELECT id FROM public.projects WHERE id = $1`, [resolvedProjectId]);
    if (!project.rows[0]) throw new AppError(404, 'not_found', 'Project not found');
  } else {
    const timesheet = await pool.query<{ id: string }>(
      `SELECT id FROM public.projects WHERE slug = 'timesheet-app' LIMIT 1`,
    );
    resolvedProjectId = timesheet.rows[0]?.id ?? null;
  }

  const token = newInviteToken();
  const tokenHash = hashToken(token);

  await pool.query(`DELETE FROM auth.invites WHERE lower(email) = $1 AND accepted_at IS NULL`, [normalized]);

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO auth.invites (email, project_id, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [normalized, resolvedProjectId, tokenHash, invitedBy, inviteExpiry()],
  );

  const inviteUrl = `${config.timesheetPublicUrl}/?invite_token=${encodeURIComponent(token)}`;
  let emailSent = false;

  if (config.mailServiceUrl) {
    try {
      const res = await fetch(`${config.mailServiceUrl}/admin/mail/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mailAuthHeader,
        },
        body: JSON.stringify({
          to: normalized,
          invite_url: inviteUrl,
        }),
      });
      emailSent = res.ok;
    } catch {
      emailSent = false;
    }
  }

  const invites = await listInvites(pool);
  const invite = invites.find((row) => row.id === inserted.rows[0].id);
  if (!invite) throw new AppError(500, 'invite_failed', 'Invite created but could not be loaded');

  return { invite, invite_url: inviteUrl, email_sent: emailSent };
}

export async function previewInvite(pool: pg.Pool, token: string) {
  const tokenHash = hashToken(token);
  const result = await pool.query<{
    email: string;
    project_name: string | null;
    expires_at: string;
  }>(
    `SELECT i.email, p.name AS project_name, i.expires_at
     FROM auth.invites i
     LEFT JOIN public.projects p ON p.id = i.project_id
     WHERE i.token_hash = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
    [tokenHash],
  );
  if (!result.rows[0]) {
    throw new AppError(404, 'invalid_invite', 'Invite link is invalid or expired');
  }
  return result.rows[0];
}

export async function acceptInvite(
  pool: pg.Pool,
  config: Config,
  token: string,
  password: string,
) {
  if (!password || password.length < 8) {
    throw new AppError(400, 'validation_error', 'Password must be at least 8 characters');
  }

  const tokenHash = hashToken(token);
  const invite = await pool.query<{
    id: string;
    email: string;
    project_id: string | null;
  }>(
    `SELECT id, email, project_id FROM auth.invites
     WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [tokenHash],
  );
  const row = invite.rows[0];
  if (!row) throw new AppError(404, 'invalid_invite', 'Invite link is invalid or expired');

  const existing = await pool.query(`SELECT id FROM auth.users WHERE email = $1`, [row.email]);
  if (existing.rows[0]) {
    throw new AppError(409, 'user_exists', 'An account with this email already exists. Sign in instead.');
  }

  const passwordHash = hashPassword(password);
  const userResult = await pool.query<DbUser>(
    `INSERT INTO auth.users (email, password_hash, email_verified)
     VALUES ($1, $2, true)
     RETURNING id, email, password_hash, created_at`,
    [row.email, passwordHash],
  );
  const user = userResult.rows[0];

  const projectId = row.project_id ?? '00000000-0000-0000-0000-000000000002';
  await pool.query(
    `INSERT INTO public.profiles (id, project_id, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id, project_id) DO NOTHING`,
    [user.id, projectId, row.email.split('@')[0]],
  );

  await pool.query(`UPDATE auth.invites SET accepted_at = NOW() WHERE id = $1`, [row.id]);

  return createSession(pool, config, user);
}
