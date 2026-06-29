import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import { hashToken, AppError } from '@supadupabase/shared';
import type { Config } from './config.js';
import { bearerToken, me } from './auth.js';

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
  config: Config,
  headers: Record<string, string | string[] | undefined>,
): Promise<{ id: string; email: string }> {
  const token = bearerToken(headers);
  if (!token) {
    throw new AppError(401, 'unauthorized', 'Missing bearer token');
  }

  const { user } = await me(pool, config, token);
  const admins = parseAdminEmails();
  if (!admins.size) {
    throw new AppError(503, 'admin_not_configured', 'ADMIN_EMAILS is not configured');
  }
  if (!admins.has(user.email.toLowerCase())) {
    throw new AppError(403, 'forbidden', 'Admin access required');
  }
  return user;
}

export async function listProjects(pool: pg.Pool) {
  const result = await pool.query<{
    id: string;
    name: string;
    slug: string;
    allowed_origins: string[];
    created_at: string;
  }>(`SELECT id, name, slug, allowed_origins, created_at FROM public.projects ORDER BY created_at`);
  return result.rows;
}

export async function listApiKeys(pool: pg.Pool) {
  const result = await pool.query<{
    id: string;
    project_id: string;
    name: string;
    key_prefix: string;
    role: string;
    created_at: string;
    project_name: string;
  }>(
    `SELECT k.id, k.project_id, k.name, k.key_prefix, k.role, k.created_at, p.name AS project_name
     FROM public.api_keys k
     JOIN public.projects p ON p.id = k.project_id
     ORDER BY k.created_at DESC`,
  );
  return result.rows;
}

function generateApiKey(role: 'anon' | 'service_role'): { plaintext: string; prefix: string; hash: string } {
  const body = randomBytes(24).toString('base64url');
  const plaintext = `sdb_${role}_${body}`;
  const prefix = plaintext.slice(0, 16);
  return { plaintext, prefix, hash: hashToken(plaintext) };
}

export async function createApiKey(
  pool: pg.Pool,
  projectId: string,
  name: string,
  role: 'anon' | 'service_role',
): Promise<{ id: string; key: string; prefix: string; role: string; project_id: string }> {
  if (!name.trim()) {
    throw new AppError(400, 'validation_error', 'Name is required');
  }
  if (role !== 'anon' && role !== 'service_role') {
    throw new AppError(400, 'validation_error', 'Role must be anon or service_role');
  }

  const project = await pool.query(`SELECT id FROM public.projects WHERE id = $1`, [projectId]);
  if (!project.rows[0]) {
    throw new AppError(404, 'not_found', 'Project not found');
  }

  const { plaintext, prefix, hash } = generateApiKey(role);
  const result = await pool.query<{ id: string }>(
    `INSERT INTO public.api_keys (project_id, name, key_hash, key_prefix, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [projectId, name.trim(), hash, prefix, role],
  );

  return {
    id: result.rows[0].id,
    key: plaintext,
    prefix,
    role,
    project_id: projectId,
  };
}
