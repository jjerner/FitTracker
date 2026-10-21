import { entryNutrition, sumEntries } from '../foods';
import type { Food, FoodLogEntry } from '../../types/domain';

// foods.ts talks to Supabase and the phone; none of that is needed to test the maths.
jest.mock('../supabase', () => ({ supabase: {} }));
jest.mock('../reminders', () => ({ refreshFoodReminders: jest.fn() }));
jest.mock('../pendingSets', () => ({ newSetId: jest.fn() }));

// Per 100 g.
const food: Food = {
  id: 'f1',
  source: 'custom',
  barcode: null,
  name: 'Test food',
  brand: null,
  servingSizeG: 30,
  servingDescription: '1 slice',
  createdBy: null,
  caloriesKcal: 200,
  proteinG: 10,
  carbsG: 20,
  fatG: 5,
  fiberG: 4,
};

describe('entryNutrition', () => {
  it('scales grams against the per-100 g values', () => {
    expect(entryNutrition(food, 150, 'g', null)).toEqual({
      calories_kcal: 300,
      protein_g: 15,
      carbs_g: 30,
      fat_g: 7.5,
      fiber_g: 6,
    });
  });

  it('uses the serving grams the entry was logged with', () => {
    expect(entryNutrition(food, 2, 'serving', 50).calories_kcal).toBe(200);
  });

  it("falls back to the food's own serving size, then to 100 g", () => {
    expect(entryNutrition(food, 2, 'serving', null).calories_kcal).toBe(120);
    expect(entryNutrition({ ...food, servingSizeG: null }, 2, 'serving', null).calories_kcal).toBe(
      400
    );
  });

  it('keeps unknown fiber unknown instead of turning it into 0', () => {
    expect(entryNutrition({ ...food, fiberG: null }, 100, 'g', null).fiber_g).toBeNull();
  });
});

describe('sumEntries', () => {
  const entry: FoodLogEntry = {
    id: 'e1',
    foodId: 'f1',
    foodName: 'Test food',
    loggedDate: '2026-10-21',
    mealType: 'lunch',
    quantity: 100,
    quantityUnit: 'g',
    servingG: null,
    caloriesKcal: 200,
    proteinG: 10,
    carbsG: 20,
    fatG: 5,
    fiberG: null,
    groupId: null,
    groupName: null,
  };

  it('gives zeros for no entries', () => {
    expect(sumEntries([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('adds kcal and macros and leaves fibre out', () => {
    expect(sumEntries([entry, { ...entry, id: 'e2', caloriesKcal: 50, fiberG: 3 }])).toEqual({
      calories: 250,
      protein: 20,
      carbs: 40,
      fat: 10,
    });
  });
});
