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

// "YYYY-MM-DD" shifted by a number of days (negative = back), in local time.
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDateOf(new Date(y, m - 1, d + days));
}
