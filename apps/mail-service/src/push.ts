import type pg from 'pg';
import webpush from 'web-push';
import { AppError } from '@supadupabase/shared';
import type { MailServiceConfig } from './config.js';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function vapidPublicKey(_config: MailServiceConfig): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function requireVapid(_config: MailServiceConfig): { publicKey: string; privateKey: string; subject: string } {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@whitelynx.co.nz';
  if (!publicKey || !privateKey) {
    throw new AppError(503, 'push_not_configured', 'Web Push (VAPID) is not configured on the server');
  }
  return { publicKey, privateKey, subject };
}

export function configureWebPush(config: MailServiceConfig): void {
  const { publicKey, privateKey, subject } = requireVapid(config);
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function savePushSubscription(
  pool: pg.Pool,
  userId: string,
  sub: PushSubscriptionInput,
): Promise<void> {
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new AppError(400, 'validation_error', 'Invalid push subscription');
  }

  await pool.query(
    `INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth_key = EXCLUDED.auth_key`,
    [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth],
  );
}

export async function removePushSubscription(
  pool: pg.Pool,
  userId: string,
  endpoint: string,
): Promise<void> {
  if (!endpoint) {
    throw new AppError(400, 'validation_error', 'endpoint is required');
  }
  await pool.query(
    `DELETE FROM public.push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
    [userId, endpoint],
  );
}

export async function removeAllPushSubscriptions(pool: pg.Pool, userId: string): Promise<void> {
  await pool.query(`DELETE FROM public.push_subscriptions WHERE user_id = $1`, [userId]);
}

const REMINDER_PAYLOAD = JSON.stringify({
  title: 'Timesheet App',
  body: 'Reminder: check your hours for this week.',
  url: '/',
});

export async function sendWeeklyReminders(pool: pg.Pool, config: MailServiceConfig): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  configureWebPush(config);

  const subs = await pool.query<{
    endpoint: string;
    p256dh: string;
    auth_key: string;
  }>(
    `SELECT ps.endpoint, ps.p256dh, ps.auth_key
     FROM public.push_subscriptions ps
     JOIN public.user_settings us ON us.user_id = ps.user_id
     WHERE us.weekly_reminder_enabled = true`,
  );

  let sent = 0;
  let failed = 0;
  const skipped = 0;

  for (const row of subs.rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth_key },
        },
        REMINDER_PAYLOAD,
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error('Push failed:', row.endpoint.slice(0, 60), err);
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await pool.query(`DELETE FROM public.push_subscriptions WHERE endpoint = $1`, [row.endpoint]);
      }
    }
  }

  return { sent, failed, skipped };
}
