// Accepts a Swedish decimal comma ("12,5") as well as a dot. Empty or non-numeric text gives null.
export function toNumberOrNull(value: string): number | null {
  const n = Number(value.replace(',', '.'));
  return value.trim() === '' || !Number.isFinite(n) ? null : n;
}
