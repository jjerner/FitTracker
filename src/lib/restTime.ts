import { toNumberOrNull } from './numbers';

export const MAX_REST_SECONDS = 600;

// "3" min + "00" sec → 180, clamped to [min, max]. Empty or non-numeric boxes count as 0.
export function restFromMinSec(minutes: string, seconds: string, min: number, max = MAX_REST_SECONDS): number {
  const total = Math.round((toNumberOrNull(minutes) ?? 0) * 60 + (toNumberOrNull(seconds) ?? 0));
  return Math.min(max, Math.max(min, total));
}

// 180 → { minutes: '3', seconds: '00' }
export function splitRest(totalSeconds: number): { minutes: string; seconds: string } {
  return {
    minutes: String(Math.floor(totalSeconds / 60)),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
  };
}

// 90 → "1:30"
export function formatRest(totalSeconds: number): string {
  const { minutes, seconds } = splitRest(totalSeconds);
  return `${minutes}:${seconds}`;
}
