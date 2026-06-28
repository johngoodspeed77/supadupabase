export interface MailServiceConfig {
  port: number;
  databaseUrl: string;
  authSecret: string;
  jwtIssuer: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpSecure: boolean;
}

export function loadConfig(): MailServiceConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const authSecret = process.env.AUTH_SECRET;
  const jwtIssuer = process.env.JWT_ISSUER ?? 'https://supadupabase.whitelynx.co.nz';

  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!authSecret) throw new Error('AUTH_SECRET is required');

  return {
    port: Number(process.env.MAIL_PORT ?? 3004),
    databaseUrl,
    authSecret,
    jwtIssuer,
    smtpHost: process.env.SMTP_HOST ?? '',
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    smtpFrom: process.env.SMTP_FROM ?? '',
    smtpSecure: process.env.SMTP_SECURE === 'true',
  };
}

export function extractBearer(headers: Record<string, string | string[] | undefined>): string | null {
  const auth = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice(7);
}
