// Calorie and macro suggestions for the Goals screen. Also used by the adaptive goal card.

export type Sex = 'male' | 'female';

// About 7 700 kcal of food per kg of body weight gained or lost.
export const KCAL_PER_KG = 7700;

export const ACTIVITY_LEVELS = [
  { label: 'Sedentary', factor: 1.2 },
  { label: 'Light (1–3 days/week)', factor: 1.375 },
  { label: 'Moderate (3–5 days/week)', factor: 1.55 },
  { label: 'Very active (6–7 days/week)', factor: 1.725 },
  { label: 'Extra (physical job + training)', factor: 1.9 },
] as const;

// Weight change per week. Negative = losing.
export const PACES = [
  { label: 'Lose 0.75 kg/week', kgPerWeek: -0.75 },
  { label: 'Lose 0.5 kg/week', kgPerWeek: -0.5 },
  { label: 'Lose 0.25 kg/week', kgPerWeek: -0.25 },
  { label: 'Keep', kgPerWeek: 0 },
  { label: 'Gain 0.25 kg/week', kgPerWeek: 0.25 },
] as const;

export const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };

export const PROTEIN_PER_KG = { min: 1.2, max: 2.6, step: 0.1 };
export const FAT_PER_KG = { min: 0.5, max: 0.8, step: 0.1 };

// Starting g/kg for a pace: more protein and less fat when losing.
export function macroDefaults(kgPerWeek: number): { proteinPerKg: number; fatPerKg: number } {
  return kgPerWeek < 0 ? { proteinPerKg: 2.0, fatPerKg: 0.6 } : { proteinPerKg: 1.6, fatPerKg: 0.8 };
}

// Daily burn: Mifflin-St Jeor BMR times the activity factor.
export function maintenanceKcal(input: {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityFactor: number;
}): number {
  const bmr =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears + (input.sex === 'male' ? 5 : -161);
  return Math.round(bmr * input.activityFactor);
}

// Age in years from a birth year saved as 1 July of that year.
export function ageFromBirthYear(year: number, now: number): number {
  return (now - Date.UTC(year, 6, 1)) / (365.25 * 86_400_000);
}

// Maintenance plus the pace's daily change, never below the floor for the sex.
export function targetKcal(input: {
  maintenanceKcal: number;
  kgPerWeek: number;
  sex?: Sex;
}): { kcal: number; clamped: boolean } {
  const kcal = Math.round(input.maintenanceKcal + (input.kgPerWeek * KCAL_PER_KG) / 7);
  // Unknown sex gets the lower (female) floor.
  const floor = MIN_KCAL[input.sex ?? 'female'];
  return kcal < floor ? { kcal: floor, clamped: true } : { kcal, clamped: false };
}

const round5 = (n: number) => Math.round(n / 5) * 5;

// Protein and fat from body weight, carbs fill the rest of the calories (never below 0).
export function macrosFor(input: {
  kcal: number;
  weightKg: number;
  proteinPerKg: number;
  fatPerKg: number;
}): { proteinG: number; carbsG: number; fatG: number } {
  const proteinG = round5(input.weightKg * input.proteinPerKg);
  const fatG = round5(input.weightKg * input.fatPerKg);
  const carbsG = round5(Math.max(0, (input.kcal - proteinG * 4 - fatG * 9) / 4));
  return { proteinG, carbsG, fatG };
}

// The current split with every macro scaled by the same factor to reach `kcal`, rounded to 5 g.
export function scaleMacros(
  current: { proteinG: number; carbsG: number; fatG: number },
  kcal: number
): { proteinG: number; carbsG: number; fatG: number } {
  // `|| 1`: an all-zero split stays zero instead of dividing by 0.
  const factor = kcal / (current.proteinG * 4 + current.carbsG * 4 + current.fatG * 9 || 1);
  return {
    proteinG: round5(current.proteinG * factor),
    carbsG: round5(current.carbsG * factor),
    fatG: round5(current.fatG * factor),
  };
}

// Route params from the maintenance card on Progress. They come from a URL, so anything
// missing, not a number, out of range or not one of PACES gives null. The target is
// recomputed here so a hand-made URL can't show one that doesn't match.
export function suggestionFromParams(params: { maintenance?: string; kgPerWeek?: string }, sex?: Sex) {
  const maintenance = Number(params.maintenance);
  const pace = PACES.find((p) => params.kgPerWeek && p.kgPerWeek === Number(params.kgPerWeek));
  if (!pace || !(maintenance >= 800 && maintenance <= 6000)) return null; // false for NaN
  const rounded = Math.round(maintenance);
  const { kcal } = targetKcal({ maintenanceKcal: rounded, kgPerWeek: pace.kgPerWeek, sex });
  return { kcal, maintenance: rounded, pace };
}
