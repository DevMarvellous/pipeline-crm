// Day-granularity date helpers. Follow-up and snooze dates are stored as
// local-timezone YYYY-MM-DD strings, so plain string comparison orders them.

export function toDayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayString(asOf: Date = new Date()): string {
  return toDayString(asOf);
}

/** Normalize a stored value (YYYY-MM-DD or full ISO) to YYYY-MM-DD. */
export function dayOf(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return toDayString(new Date(iso));
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function addDaysString(days: number, asOf: Date = new Date()): string {
  return toDayString(addDays(asOf, days));
}

export function isOverdue(dateStr: string, asOf: Date = new Date()): boolean {
  return dayOf(dateStr) < todayString(asOf);
}

export function isToday(dateStr: string, asOf: Date = new Date()): boolean {
  return dayOf(dateStr) === todayString(asOf);
}

export function isDue(dateStr: string, asOf: Date = new Date()): boolean {
  return dayOf(dateStr) <= todayString(asOf);
}

/** Days from asOf to dateStr (negative = past). */
export function daysUntil(dateStr: string, asOf: Date = new Date()): number {
  const target = new Date(dayOf(dateStr) + 'T00:00:00');
  const from = new Date(todayString(asOf) + 'T00:00:00');
  return Math.round((target.getTime() - from.getTime()) / 86_400_000);
}

/** Human label: "Today", "Tomorrow", "3 days overdue", "In 5 days", or a short date. */
export function relativeDayLabel(dateStr: string, asOf: Date = new Date()): string {
  const n = daysUntil(dateStr, asOf);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n < 0) return `${-n} days overdue`;
  if (n <= 7) return `In ${n} days`;
  return new Date(dayOf(dateStr) + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
