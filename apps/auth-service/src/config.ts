export interface Config {
  port: number;
  databaseUrl: string;
  authSecret: string;
  jwtIssuer: string;
  publicUrl: string;
  mailServiceUrl: string;
  timesheetPublicUrl: string;
  inviteOnly: boolean;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  const authSecret = process.env.AUTH_SECRET;
  const jwtIssuer = process.env.JWT_ISSUER ?? 'https://supadupabase.whitelynx.co.nz';
  const publicUrl = process.env.PUBLIC_URL ?? 'https://supadupabase.whitelynx.co.nz';

  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!authSecret) throw new Error('AUTH_SECRET is required');

  return {
    port: Number(process.env.AUTH_PORT ?? 3001),
    databaseUrl,
    authSecret,
    jwtIssuer,
    publicUrl: publicUrl.replace(/\/$/, ''),
    mailServiceUrl: (process.env.MAIL_SERVICE_URL ?? 'http://mail-service:3004').replace(/\/$/, ''),
    timesheetPublicUrl: (process.env.TIMESHEET_PUBLIC_URL ?? 'https://timesheet.whitelynx.co.nz').replace(
      /\/$/,
      '',
    ),
    inviteOnly: process.env.INVITE_ONLY === '1' || process.env.INVITE_ONLY === 'true',
  };
}
