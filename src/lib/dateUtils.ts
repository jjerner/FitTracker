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
