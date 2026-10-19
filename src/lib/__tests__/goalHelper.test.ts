import { KCAL_PER_KG, PACES, macroDefaults, macrosFor, maintenanceKcal, targetKcal } from '../goalHelper';

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
    expect(KCAL_PER_KG).toBe(7700);
    const kcal = (kgPerWeek: number) => targetKcal({ maintenanceKcal: 2759, kgPerWeek, sex: 'male' }).kcal;
    expect(PACES.map((p) => kcal(p.kgPerWeek))).toEqual([2759 - 825, 2759 - 550, 2759 - 275, 2759, 2759 + 275]);
  });

  it('clamps at 1200 kcal for women and 1500 for men', () => {
    expect(targetKcal({ maintenanceKcal: 1700, kgPerWeek: -0.75, sex: 'female' })).toEqual({ kcal: 1200, clamped: true });
    expect(targetKcal({ maintenanceKcal: 1700, kgPerWeek: -0.75, sex: 'male' })).toEqual({ kcal: 1500, clamped: true });
    expect(targetKcal({ maintenanceKcal: 1700, kgPerWeek: -0.25, sex: 'female' })).toEqual({ kcal: 1425, clamped: false });
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

  it('never gives negative carbs', () => {
    const small = maintenanceKcal({ sex: 'female', ageYears: 70, heightCm: 150, weightKg: 45, activityFactor: 1.2 });
    const { kcal } = targetKcal({ maintenanceKcal: small, kgPerWeek: -0.75, sex: 'female' });
    expect(kcal).toBe(1200);
    expect(macrosFor({ kcal: 800, weightKg: 150, proteinPerKg: 2.6, fatPerKg: 0.8 }).carbsG).toBe(0);
  });

  it('gives every macro as a multiple of 5', () => {
    const macros = macrosFor({ kcal: 2333, weightKg: 77.7, proteinPerKg: 2.1, fatPerKg: 0.7 });
    Object.values(macros).forEach((g) => expect(g % 5).toBe(0));
  });
});
