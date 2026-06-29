import { AppError } from '@supadupabase/shared';
import { buildInviteEmail } from './email.js';
import { sendMail } from './smtp.js';
import { toSmtpConfig, type MailServiceConfig } from './config.js';
import { smtpStatus } from './test.js';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendInviteEmail(
  config: MailServiceConfig,
  to: string,
  inviteUrl: string,
): Promise<{ ok: true; sent_to: string }> {
  const status = smtpStatus(config);
  if (!status.configured) {
    throw new AppError(503, 'smtp_not_configured', 'SMTP is not configured');
  }

  const trimmed = to.trim().toLowerCase();
  if (!trimmed || !isValidEmail(trimmed)) {
    throw new AppError(400, 'validation_error', 'A valid recipient email is required');
  }
  if (!inviteUrl.trim()) {
    throw new AppError(400, 'validation_error', 'invite_url is required');
  }

  const { subject, html, text } = buildInviteEmail(inviteUrl.trim());
  await sendMail(toSmtpConfig(config), trimmed, subject, html, text);
  return { ok: true, sent_to: trimmed };
}
