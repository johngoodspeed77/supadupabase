import { formatDateNz, formatHours, formatWeekRange, type WeekCalc } from './hours.js';

const TIMESHEET_EMAIL_TITLE = 'Fuzed Group- Employee Weekly Timesheet';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildTimesheetEmail(
  employeeName: string,
  employeeEmail: string,
  weekStart: string,
  week: WeekCalc,
): { subject: string; html: string; text: string } {
  const range = formatWeekRange(weekStart);
  const subject = `Timesheet — ${employeeName} — Week of ${formatDateNz(weekStart)}`;

  const rows = week.days
    .map((d) => {
      if (d.kind === 'leave') {
        const detail = d.durationPart ? `${d.label} (${d.durationPart})` : d.label;
        return `<tr>
        <td>${esc(formatDateNz(d.workDate))}</td>
        <td>${esc(d.dayName)}</td>
        <td colspan="2">${esc(detail)}</td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
        <td>${formatHours(d.leaveHours)}</td>
      </tr>`;
      }
      return `<tr>
        <td>${esc(formatDateNz(d.workDate))}</td>
        <td>${esc(d.dayName)}</td>
        <td>${esc(d.startTime)}</td>
        <td>${esc(d.endTime)}</td>
        <td>${formatHours(d.worked)}</td>
        <td>${formatHours(d.regular)}</td>
        <td>${formatHours(d.dailyOt)}</td>
        <td>—</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111;">
  <h1>${esc(TIMESHEET_EMAIL_TITLE)}</h1>
  <p><strong>Employee:</strong> ${esc(employeeName)}<br>
  <strong>Email:</strong> ${esc(employeeEmail)}<br>
  <strong>Week:</strong> ${esc(range)}</p>
  <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:900px;">
    <thead>
      <tr style="background:#e2e8f0;">
        <th>Date</th><th>Day</th><th>Start</th><th>Finish</th>
        <th>Hours</th><th>Regular</th><th>OT</th><th>Leave h</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="8">No entries</td></tr>'}</tbody>
    <tfoot>
      <tr style="background:#f1f5f9;font-weight:bold;">
        <td colspan="4">Week totals</td>
        <td>${formatHours(week.totalWorked)}</td>
        <td>${formatHours(week.totalRegular)}</td>
        <td>${formatHours(week.totalOt)}</td>
        <td>${formatHours(week.totalLeaveHours)}</td>
      </tr>
    </tfoot>
  </table>
  <p style="color:#64748b;font-size:12px;">Sent from ${esc(TIMESHEET_EMAIL_TITLE)}. Lunch break (30 min) deducted per work day. Leave hours: full day = 8h, AM/PM = 4h.</p>
</body>
</html>`;

  const textLines = [
    TIMESHEET_EMAIL_TITLE,
    `Employee: ${employeeName}`,
    `Email: ${employeeEmail}`,
    `Week: ${range}`,
    '',
    'Date       Day        Start  Finish Hours  Reg   OT    Leave',
  ];

  for (const d of week.days) {
    if (d.kind === 'leave') {
      const detail = d.durationPart ? `${d.label} (${d.durationPart})` : d.label;
      textLines.push(
        `${formatDateNz(d.workDate).padEnd(10)} ${d.dayName.padEnd(10)} ${detail.padEnd(12)} —     —     —     ${formatHours(d.leaveHours).padStart(5)}`,
      );
    } else {
      textLines.push(
        `${formatDateNz(d.workDate).padEnd(10)} ${d.dayName.padEnd(10)} ${d.startTime}  ${d.endTime}  ${formatHours(d.worked).padStart(5)} ${formatHours(d.regular).padStart(5)} ${formatHours(d.dailyOt).padStart(5)} ${formatHours(0).padStart(5)}`,
      );
    }
  }

  textLines.push(
    '',
    `Totals: hours ${formatHours(week.totalWorked)}, regular ${formatHours(week.totalRegular)}, OT ${formatHours(week.totalOt)}, leave ${formatHours(week.totalLeaveHours)}`,
  );

  return { subject, html, text: textLines.join('\n') };
}

export function buildTestEmail(): { subject: string; html: string; text: string } {
  const subject = 'SupaDupaBase — test email';
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111;">
  <h1>SupaDupaBase</h1>
  <p>This is a test email from your SupaDupaBase mail service.</p>
  <p style="color:#64748b;font-size:12px;">If you received this, SMTP is configured correctly.</p>
</body>
</html>`;
  const text = [
    'SupaDupaBase',
    '',
    'This is a test email from your SupaDupaBase mail service.',
    'If you received this, SMTP is configured correctly.',
  ].join('\n');
  return { subject, html, text };
}

export function buildInviteEmail(inviteUrl: string): { subject: string; html: string; text: string } {
  const subject = 'You are invited to Timesheet App';
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111;">
  <h1>Timesheet App</h1>
  <p>You have been invited to create an account on Timesheet App (SupaDupaBase).</p>
  <p><a href="${esc(inviteUrl)}" style="display:inline-block;padding:12px 20px;background:#06b6d4;color:#000;text-decoration:none;border-radius:8px;font-weight:600;">Accept invite &amp; set password</a></p>
  <p style="color:#64748b;font-size:12px;">This link expires in 7 days. If you did not expect this email, you can ignore it.</p>
  <p style="color:#64748b;font-size:12px;word-break:break-all;">${esc(inviteUrl)}</p>
</body>
</html>`;
  const text = [
    'Timesheet App',
    '',
    'You have been invited to create an account.',
    '',
    `Open this link to accept and set your password (expires in 7 days):`,
    inviteUrl,
  ].join('\n');
  return { subject, html, text };
}
