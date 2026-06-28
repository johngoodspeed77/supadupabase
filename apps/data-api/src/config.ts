import { verifyJwt, AppError } from '@supadupabase/shared';

export interface DataApiConfig {
  port: number;
  databaseUrl: string;
  authSecret: string;
  jwtIssuer: string;
}

export function loadConfig(): DataApiConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const authSecret = process.env.AUTH_SECRET;
  const jwtIssuer = process.env.JWT_ISSUER ?? 'https://supadupabase.whitelynx.co.nz';

  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!authSecret) throw new Error('AUTH_SECRET is required');

  return {
    port: Number(process.env.DATA_PORT ?? 3002),
    databaseUrl,
    authSecret,
    jwtIssuer,
  };
}

export function extractBearer(headers: Record<string, string | string[] | undefined>): string | null {
  const auth = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice(7);
}

export function verifyAccessToken(
  config: DataApiConfig,
  token: string,
): { sub: string; email: string; role?: string } {
  try {
    const payload = verifyJwt(token, config.authSecret, config.jwtIssuer);
    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch {
    throw new AppError(401, 'invalid_token', 'Invalid or expired access token');
  }
}

/** Tables exposed via REST in MVP */
export const ALLOWED_TABLES = new Set([
  'profiles',
  'user_settings',
  'time_entries',
  'week_submissions',
]);

export function assertAllowedTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new AppError(404, 'table_not_found', `Table not found: ${table}`);
  }
}

export function parseSelect(query: Record<string, string>): string[] {
  const select = query.select ?? '*';
  if (select === '*') return ['*'];
  return select.split(',').map((c) => c.trim()).filter(Boolean);
}

export function parseFilters(query: Record<string, string>): Array<{ column: string; value: string }> {
  const filters: Array<{ column: string; value: string }> = [];
  for (const [key, raw] of Object.entries(query)) {
    if (key === 'select' || key === 'limit' || key === 'order') continue;
    if (raw.startsWith('eq.')) {
      filters.push({ column: key, value: raw.slice(3) });
    }
  }
  return filters;
}

export function quoteIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new AppError(400, 'invalid_column', `Invalid identifier: ${name}`);
  }
  return `"${name}"`;
}
