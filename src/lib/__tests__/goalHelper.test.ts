import {
  PACES,
  ageFromBirthYear,
  macroDefaults,
  macrosFor,
  maintenanceKcal,
  scaleMacros,
  suggestionFromParams,
  targetKcal,
} from '../goalHelper';

const MAN = { sex: 'male' as const, ageYears: 30, heightCm: 180, weightKg: 80, activityFactor: 1.55 };

describe('maintenanceKcal', () => {
  it('uses Mifflin-St Jeor times the activity factor', () => {
    // BMR 1780 × 1.55
    expect(maintenanceKcal(MAN)).toBe(2759);
  });

  it('gives a woman 166 kcal less BMR with the same inputs', () => {
    const female = maintenanceKcal({ ...MAN, sex: 'female', activityFactor: 1 });
    expect(maintenanceKcal({ ...MAN, activityFactor: 1 }) - female).toBe(166);
  });
});

describe('targetKcal', () => {
  it('shifts maintenance by pace × 7700 / 7', () => {
    const kcal = (kgPerWeek: number) => targetKcal({ maintenanceKcal: 2759, kgPerWeek, sex: 'male' }).kcal;
    expect(PACES.map((p) => kcal(p.kgPerWeek))).toEqual([2759 - 825, 2759 - 550, 2759 - 275, 2759, 2759 + 275]);
  });

  it('clamps at 1200 kcal for women and 1500 for men', () => {
    expect(targetKcal({ maintenanceKcal: 1700, kgPerWeek: -0.75, sex: 'female' })).toEqual({ kcal: 1200, clamped: true });
    expect(targetKcal({ maintenanceKcal: 1700, kgPerWeek: -0.75, sex: 'male' })).toEqual({ kcal: 1500, clamped: true });
    expect(targetKcal({ maintenanceKcal: 1700, kgPerWeek: -0.25, sex: 'female' })).toEqual({ kcal: 1425, clamped: false });
  });

  it('uses the 1200 kcal floor when the sex is unknown', () => {
    expect(targetKcal({ maintenanceKcal: 1700, kgPerWeek: -0.75 })).toEqual({ kcal: 1200, clamped: true });
  });

  it('clamps a small, older woman losing fast to 1200 kcal', () => {
    const small = maintenanceKcal({ sex: 'female', ageYears: 70, heightCm: 150, weightKg: 45, activityFactor: 1.2 });
    expect(targetKcal({ maintenanceKcal: small, kgPerWeek: -0.75, sex: 'female' }).kcal).toBe(1200);
  });
});

describe('ageFromBirthYear', () => {
  it('counts from 1 July of the birth year', () => {
    expect(ageFromBirthYear(1990, Date.UTC(2020, 6, 1))).toBeCloseTo(30, 1);
    expect(ageFromBirthYear(1990, Date.UTC(2021, 0, 1))).toBeCloseTo(30.5, 1);
  });
});

describe('macroDefaults', () => {
  it('loads more protein and less fat when losing', () => {
    expect(macroDefaults(-0.5)).toEqual({ proteinPerKg: 2.0, fatPerKg: 0.6 });
    expect(macroDefaults(0)).toEqual({ proteinPerKg: 1.6, fatPerKg: 0.8 });
    expect(macroDefaults(0.25)).toEqual({ proteinPerKg: 1.6, fatPerKg: 0.8 });
  });
});

describe('macrosFor', () => {
  it('sets protein and fat from body weight and fills the rest with carbs, rounded to 5 g', () => {
    // protein 128 → 130, fat 64 → 65, carbs (2759 − 520 − 585) / 4 = 413.5 → 415
    expect(macrosFor({ kcal: 2759, weightKg: 80, proteinPerKg: 1.6, fatPerKg: 0.8 })).toEqual({
      proteinG: 130,
      carbsG: 415,
      fatG: 65,
    });
  });

  it('gives 0 carbs when protein and fat already exceed the calories', () => {
    expect(macrosFor({ kcal: 800, weightKg: 150, proteinPerKg: 2.6, fatPerKg: 0.8 }).carbsG).toBe(0);
  });

  it('gives every macro as a multiple of 5', () => {
    const macros = macrosFor({ kcal: 2333, weightKg: 77.7, proteinPerKg: 2.1, fatPerKg: 0.7 });
    Object.values(macros).forEach((g) => expect(g % 5).toBe(0));
  });
});

describe('scaleMacros', () => {
  it('scales every macro by new kcal ÷ current kcal, rounded to 5 g', () => {
    // 150×4 + 200×4 + 65×9 = 1985 kcal; × 1.5
    expect(scaleMacros({ proteinG: 150, carbsG: 200, fatG: 65 }, 2977.5)).toEqual({
      proteinG: 225,
      carbsG: 300,
      fatG: 100, // 97.5 → 100
    });
  });

  it('keeps an all-zero split at zero', () => {
    expect(scaleMacros({ proteinG: 0, carbsG: 0, fatG: 0 }, 2000)).toEqual({ proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe('suggestionFromParams', () => {
  it('reads valid params and recomputes the target', () => {
    expect(suggestionFromParams({ maintenance: '2350', kgPerWeek: '-0.5' })).toEqual({
      kcal: 1800,
      maintenance: 2350,
      pace: PACES[1],
    });
  });

  it('applies the floor for the sex', () => {
    expect(suggestionFromParams({ maintenance: '1700', kgPerWeek: '-0.75' }, 'male')?.kcal).toBe(1500);
    expect(suggestionFromParams({ maintenance: '1700', kgPerWeek: '-0.75' })?.kcal).toBe(1200);
  });

  it('accepts maintenance from 800 to 6000', () => {
    expect(suggestionFromParams({ maintenance: '800', kgPerWeek: '0' })).not.toBeNull();
    expect(suggestionFromParams({ maintenance: '6000', kgPerWeek: '0' })).not.toBeNull();
    expect(suggestionFromParams({ maintenance: '799', kgPerWeek: '0' })).toBeNull();
    expect(suggestionFromParams({ maintenance: '6001', kgPerWeek: '0' })).toBeNull();
  });

  it('gives null for missing, non-number or unknown pace params', () => {
    expect(suggestionFromParams({})).toBeNull();
    expect(suggestionFromParams({ maintenance: 'abc', kgPerWeek: '0' })).toBeNull();
    expect(suggestionFromParams({ maintenance: '2350', kgPerWeek: '-3' })).toBeNull();
    expect(suggestionFromParams({ maintenance: '2350', kgPerWeek: '' })).toBeNull();
  });
});
