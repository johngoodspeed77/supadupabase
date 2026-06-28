export interface DayCalc {
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

export interface WeekCalc {
  days: DayCalc[];
  totalWorked: number;
  totalRegular: number;
  totalOt: number;
  totalPaid: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseTimeToHours(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h + (m || 0) / 60 + (s || 0) / 3600;
}

export function formatHours(n: number): string {
  return n.toFixed(2);
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

export function calcDay(
  workDate: string,
  startTime: string,
  endTime: string,
  notes: string | null = null,
): DayCalc {
  const gross = parseTimeToHours(endTime) - parseTimeToHours(startTime);
  const worked = Math.max(0, gross - 0.5);
  const rate = dayRate(workDate);
  const regular = Math.min(worked, 8);
  const dailyOt = Math.max(0, worked - 8);
  const paidRegular = regular * rate;
  const paidOt = dailyOt * rate * 1.5;
  const d = new Date(`${workDate}T12:00:00`);

  return {
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
    start_time: string;
    end_time: string;
    notes?: string | null;
  }>,
  weekStart: string,
): WeekCalc {
  const byDate = new Map(entries.map((e) => [e.work_date, e]));
  const days: DayCalc[] = [];

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    const entry = byDate.get(date);
    if (entry) {
      days.push(calcDay(date, entry.start_time, entry.end_time, entry.notes ?? null));
    }
  }

  return {
    days,
    totalWorked: days.reduce((s, d) => s + d.worked, 0),
    totalRegular: days.reduce((s, d) => s + d.regular, 0),
    totalOt: days.reduce((s, d) => s + d.dailyOt, 0),
    totalPaid: days.reduce((s, d) => s + d.totalPaid, 0),
  };
}

export function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6);
  return `${weekStart} to ${end}`;
}
