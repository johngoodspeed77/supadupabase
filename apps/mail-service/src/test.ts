import { AppError } from '@supadupabase/shared';
import { buildTestEmail } from './email.js';
import { sendMail } from './smtp.js';
import { toSmtpConfig, type MailServiceConfig } from './config.js';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function smtpStatus(config: MailServiceConfig): {
  configured: boolean;
  smtp_host: string | null;
  smtp_port: number;
  smtp_from: string | null;
} {
  const configured = Boolean(
    config.smtpHost && config.smtpFrom && config.smtpUser && config.smtpPass,
  );
  return {
    configured,
    smtp_host: config.smtpHost || null,
    smtp_port: config.smtpPort,
    smtp_from: config.smtpFrom || null,
  };
}

export async function sendTestEmail(
  config: MailServiceConfig,
  to: string,
): Promise<{ ok: true; sent_to: string }> {
  const trimmed = to.trim().toLowerCase();
  if (!trimmed || !isValidEmail(trimmed)) {
    throw new AppError(400, 'validation_error', 'A valid recipient email is required');
  }

  const { subject, html, text } = buildTestEmail();
  await sendMail(toSmtpConfig(config), trimmed, subject, html, text);
  return { ok: true, sent_to: trimmed };
}
