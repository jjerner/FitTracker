// Shown dates follow the app's language (English), not the phone's language setting.
export const DATE_LOCALE = 'en-GB';

export function todayLocalDate(): string {
  return localDateDaysAgo(0);
}

export function localDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateOf(date);
}

// Date -> "YYYY-MM-DD" in the device's time zone.
export function localDateOf(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

// "YYYY-MM-DD" of the Monday in the same week as the given date.
export function mondayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return localDateOf(day);
}

// "YYYY-MM-DD" shifted by a number of days (negative = back), in local time.
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDateOf(new Date(y, m - 1, d + days));
}
