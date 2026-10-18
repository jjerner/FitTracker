export const DEFAULT_BAR_KG = 20;
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

// Plates for one side of the bar, biggest first. Counts in hundredths of a kg so
// 22.5 or 62.5 never hit float rounding. leftoverKg is how much of the total
// (both sides together) could not be loaded. Null for negative or non-finite input.
export function platesPerSide(
  totalKg: number,
  barKg = DEFAULT_BAR_KG,
  plates = DEFAULT_PLATES_KG
): { perSide: number[]; leftoverKg: number } | null {
  if (!Number.isFinite(totalKg) || !Number.isFinite(barKg) || totalKg < 0 || barKg < 0) {
    return null;
  }
  const total = Math.round(totalKg * 100);
  const bar = Math.round(barKg * 100);
  if (total <= bar) return { perSide: [], leftoverKg: 0 };

  let side = Math.floor((total - bar) / 2);
  const perSide: number[] = [];
  // With this plate set, biggest-first always gives the fewest plates.
  for (const plate of [...plates].sort((x, y) => y - x)) {
    const p = Math.round(plate * 100);
    while (p > 0 && side >= p) {
      perSide.push(plate);
      side -= p;
    }
  }
  const loaded = perSide.reduce((sum, plate) => sum + Math.round(plate * 100), 0);
  return { perSide, leftoverKg: (total - bar - 2 * loaded) / 100 };
}
