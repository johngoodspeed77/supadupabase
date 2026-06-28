import { formatHours, formatWeekRange, type WeekCalc } from './hours.js';

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
  const subject = `Timesheet — ${employeeName} — Week of ${weekStart}`;

  const rows = week.days
    .map(
      (d) => `<tr>
        <td>${esc(d.workDate)}</td>
        <td>${esc(d.dayName)}</td>
        <td>${esc(d.startTime)}</td>
        <td>${esc(d.endTime)}</td>
        <td>${formatHours(d.worked)}</td>
        <td>${formatHours(d.regular)}</td>
        <td>${formatHours(d.dailyOt)}</td>
        <td>${d.rate}×</td>
        <td>${formatHours(d.totalPaid)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111;">
  <h1>Timesheet App</h1>
  <p><strong>Employee:</strong> ${esc(employeeName)}<br>
  <strong>Email:</strong> ${esc(employeeEmail)}<br>
  <strong>Week:</strong> ${esc(range)}</p>
  <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:900px;">
    <thead>
      <tr style="background:#e2e8f0;">
        <th>Date</th><th>Day</th><th>Start</th><th>Finish</th>
        <th>Hours</th><th>Regular</th><th>OT</th><th>Rate</th><th>Paid equiv</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="9">No entries</td></tr>'}</tbody>
    <tfoot>
      <tr style="background:#f1f5f9;font-weight:bold;">
        <td colspan="4">Week totals</td>
        <td>${formatHours(week.totalWorked)}</td>
        <td>${formatHours(week.totalRegular)}</td>
        <td>${formatHours(week.totalOt)}</td>
        <td></td>
        <td>${formatHours(week.totalPaid)}</td>
      </tr>
    </tfoot>
  </table>
  <p style="color:#64748b;font-size:12px;">Sent from Timesheet App. Lunch break (30 min) deducted per day.</p>
</body>
</html>`;

  const textLines = [
    'Timesheet App',
    `Employee: ${employeeName}`,
    `Email: ${employeeEmail}`,
    `Week: ${range}`,
    '',
    'Date       Day        Start  Finish Hours  Reg   OT    Rate  Paid',
  ];

  for (const d of week.days) {
    textLines.push(
      `${d.workDate} ${d.dayName.padEnd(10)} ${d.startTime}  ${d.endTime}  ${formatHours(d.worked).padStart(5)} ${formatHours(d.regular).padStart(5)} ${formatHours(d.dailyOt).padStart(5)} ${String(d.rate).padStart(4)} ${formatHours(d.totalPaid).padStart(5)}`,
    );
  }

  textLines.push(
    '',
    `Totals: hours ${formatHours(week.totalWorked)}, regular ${formatHours(week.totalRegular)}, OT ${formatHours(week.totalOt)}, paid equiv ${formatHours(week.totalPaid)}`,
  );

  return { subject, html, text: textLines.join('\n') };
}
