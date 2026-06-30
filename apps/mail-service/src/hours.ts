export interface WorkDayCalc {
  kind: 'work';
  workDate: string;
  dayName: string;
  startTime: string;
  endTime: string;
  worked: number;
  regular: number;
  dailyOt: number;
  rate: number;
  paidRegular: number;
  paidOt: number;
  totalPaid: number;
  notes: string | null;
}

export interface LeaveDayCalc {
  kind: 'leave';
  workDate: string;
  dayName: string;
  leaveType: string;
  leaveDuration: string | null;
  leaveHours: number;
  label: string;
  durationPart: string | null;
  notes: string | null;
}

export type DayCalc = WorkDayCalc | LeaveDayCalc;

export interface WeekCalc {
  days: DayCalc[];
  totalWorked: number;
  totalLeaveHours: number;
  totalRegular: number;
  totalOt: number;
  totalPaid: number;
}

export const LEAVE_TYPES: Record<string, { label: string; paid: boolean }> = {
  day_off: { label: 'Day off', paid: false },
  non_paid_leave: { label: 'Non-paid leave', paid: false },
  annual_leave: { label: 'Annual leave', paid: true },
  sick_leave: { label: 'Sick leave', paid: true },
  medical_leave: { label: 'Medical leave', paid: true },
  bereavement_leave: { label: 'Bereavement leave', paid: true },
};

export const LEAVE_DURATIONS: Record<string, { label: string; hours: number }> = {
  full: { label: 'Full day', hours: 8 },
  am: { label: 'AM', hours: 4 },
  pm: { label: 'PM', hours: 4 },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseTimeToHours(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h + (m || 0) / 60 + (s || 0) / 3600;
}

export function formatHours(n: number): string {
  return n.toFixed(2);
}

function normalizeDate(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

/** New Zealand display format DD/MM/YYYY. */
export function formatDateNz(isoDate: string): string {
  const iso = normalizeDate(isoDate);
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function dayRate(workDate: string): number {
  const d = new Date(`${workDate}T12:00:00`);
  const dow = d.getDay();
  if (dow === 0) return 2.0;
  if (dow === 6) return 1.5;
  return 1.0;
}

export function weekStartFor(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isPaidLeaveType(leaveType: string): boolean {
  return Boolean(LEAVE_TYPES[leaveType]?.paid);
}

export function leaveTypeLabel(leaveType: string): string {
  return LEAVE_TYPES[leaveType]?.label ?? leaveType;
}

export function leaveDurationLabel(leaveDuration: string): string {
  return LEAVE_DURATIONS[leaveDuration]?.label ?? leaveDuration;
}

export function leaveCreditHours(leaveType: string, leaveDuration: string | null): number {
  if (!isPaidLeaveType(leaveType)) return 0;
  if (!leaveDuration) return 0;
  return LEAVE_DURATIONS[leaveDuration]?.hours ?? 0;
}

function entryTypeFor(entry: { entry_type?: string }): 'work' | 'leave' {
  return entry.entry_type === 'leave' ? 'leave' : 'work';
}

export function calcLeaveDay(
  entry: {
    work_date: string;
    leave_type: string;
    leave_duration?: string | null;
    notes?: string | null;
  },
): LeaveDayCalc {
  const workDate = normalizeDate(entry.work_date);
  const leaveType = entry.leave_type;
  const leaveDuration = entry.leave_duration ?? null;
  const leaveHours = leaveCreditHours(leaveType, leaveDuration);
  const d = new Date(`${workDate}T12:00:00`);

  return {
    kind: 'leave',
    workDate,
    dayName: DAY_NAMES[d.getDay()],
    leaveType,
    leaveDuration,
    leaveHours,
    label: leaveTypeLabel(leaveType),
    durationPart: leaveHours > 0 && leaveDuration ? leaveDurationLabel(leaveDuration) : null,
    notes: entry.notes ?? null,
  };
}

export function calcDay(
  workDate: string,
  startTime: string,
  endTime: string,
  notes: string | null = null,
): WorkDayCalc {
  const gross = parseTimeToHours(endTime) - parseTimeToHours(startTime);
  const worked = Math.max(0, gross - 0.5);
  const rate = dayRate(workDate);
  const regular = Math.min(worked, 8);
  const dailyOt = Math.max(0, worked - 8);
  const paidRegular = regular * rate;
  const paidOt = dailyOt * rate * 1.5;
  const d = new Date(`${workDate}T12:00:00`);

  return {
    kind: 'work',
    workDate,
    dayName: DAY_NAMES[d.getDay()],
    startTime: startTime.slice(0, 5),
    endTime: endTime.slice(0, 5),
    worked,
    regular,
    dailyOt,
    rate,
    paidRegular,
    paidOt,
    totalPaid: paidRegular + paidOt,
    notes,
  };
}

export function calcWeek(
  entries: Array<{
    work_date: string;
    start_time?: string | null;
    end_time?: string | null;
    entry_type?: string;
    leave_type?: string | null;
    leave_duration?: string | null;
    notes?: string | null;
  }>,
  weekStart: string,
): WeekCalc {
  const byDate = new Map(entries.map((e) => [normalizeDate(e.work_date), e]));
  const days: DayCalc[] = [];

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    const entry = byDate.get(date);
    if (!entry) continue;
    if (entryTypeFor(entry) === 'leave' && entry.leave_type) {
      days.push(calcLeaveDay(entry as { work_date: string; leave_type: string; leave_duration?: string | null; notes?: string | null }));
    } else if (entry.start_time && entry.end_time) {
      days.push(calcDay(date, entry.start_time, entry.end_time, entry.notes ?? null));
    }
  }

  const workDays = days.filter((d): d is WorkDayCalc => d.kind === 'work');
  const leaveDays = days.filter((d): d is LeaveDayCalc => d.kind === 'leave');

  return {
    days,
    totalWorked: workDays.reduce((s, d) => s + d.worked, 0),
    totalLeaveHours: leaveDays.reduce((s, d) => s + d.leaveHours, 0),
    totalRegular: workDays.reduce((s, d) => s + d.regular, 0),
    totalOt: workDays.reduce((s, d) => s + d.dailyOt, 0),
    totalPaid: workDays.reduce((s, d) => s + d.totalPaid, 0),
  };
}

export function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6);
  return `${formatDateNz(weekStart)} to ${formatDateNz(end)}`;
}
