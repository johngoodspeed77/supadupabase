import type pg from 'pg';
import { AppError } from '@supadupabase/shared';
import { withJwtContext } from '@supadupabase/db';
import { addDays, calcWeek } from './hours.js';
import { buildTimesheetEmail } from './email.js';
import { sendMail, formatMailbox } from './smtp.js';
import { toSmtpConfig, type MailServiceConfig } from './config.js';

interface UserRow {
  email: string;
}

interface SettingsRow {
  boss_email: string;
  employee_name: string | null;
}

interface EntryRow {
  work_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function submitTimesheet(
  pool: pg.Pool,
  config: MailServiceConfig,
  userId: string,
  weekStart: string,
): Promise<{ ok: true; email_sent_to: string; submitted_at: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw new AppError(400, 'validation_error', 'week_start must be YYYY-MM-DD');
  }

  const weekEnd = addDays(weekStart, 6);

  return withJwtContext(pool, userId, async (client) => {
    const existing = await client.query(
      `SELECT id FROM public.week_submissions WHERE user_id = $1 AND week_start = $2`,
      [userId, weekStart],
    );
    if (existing.rowCount) {
      throw new AppError(409, 'week_locked', 'This week has already been submitted');
    }

    const settingsRes = await client.query<SettingsRow>(
      `SELECT boss_email, employee_name FROM public.user_settings WHERE user_id = $1`,
      [userId],
    );
    const settings = settingsRes.rows[0];
    if (!settings?.boss_email || !isValidEmail(settings.boss_email)) {
      throw new AppError(400, 'boss_email_required', 'Set a valid boss email in Settings before submitting');
    }

    const userRes = await client.query<UserRow>(
      `SELECT email FROM auth.users WHERE id = $1`,
      [userId],
    );
    const user = userRes.rows[0];
    if (!user) {
      throw new AppError(404, 'user_not_found', 'User not found');
    }

    const entriesRes = await client.query<EntryRow>(
      `SELECT work_date::text, start_time::text, end_time::text, notes
       FROM public.time_entries
       WHERE user_id = $1 AND work_date >= $2 AND work_date <= $3
       ORDER BY work_date`,
      [userId, weekStart, weekEnd],
    );

    if (!entriesRes.rowCount) {
      throw new AppError(400, 'no_entries', 'No time entries for this week');
    }

    const employeeName = settings.employee_name?.trim() || user.email.split('@')[0];
    const week = calcWeek(entriesRes.rows, weekStart);
    const { subject, html, text } = buildTimesheetEmail(
      employeeName,
      user.email,
      weekStart,
      week,
    );

    await sendMail(toSmtpConfig(config), settings.boss_email, subject, html, text, {
      from: formatMailbox(employeeName, user.email),
      replyTo: user.email,
    });

    const insertRes = await client.query<{ submitted_at: string }>(
      `INSERT INTO public.week_submissions (user_id, week_start, email_sent_to)
       VALUES ($1, $2, $3)
       RETURNING submitted_at::text`,
      [userId, weekStart, settings.boss_email],
    );

    return {
      ok: true,
      email_sent_to: settings.boss_email,
      submitted_at: insertRes.rows[0].submitted_at,
    };
  });
}
