import { entryNutrition, scaleSavedMealItems } from '../foods';
import type { Food, SavedMeal } from '../../types/domain';

// foods.ts talks to Supabase and the phone; none of that is needed to test the maths.
jest.mock('../supabase', () => ({ supabase: {} }));
jest.mock('../reminders', () => ({ refreshFoodReminders: jest.fn() }));
jest.mock('../pendingSets', () => ({ newSetId: jest.fn() }));

// Per 100 g.
const food: Food = {
  id: 'f1',
  source: 'custom',
  barcode: null,
  name: 'Flour',
  brand: null,
  servingSizeG: 30,
  servingDescription: '1 scoop',
  createdBy: null,
  caloriesKcal: 360,
  proteinG: 10,
  carbsG: 75,
  fatG: 1,
  fiberG: 3,
};

const pancakes: SavedMeal = {
  id: 'm1',
  name: 'Pancakes',
  portions: 12,
  items: [
    { food, quantity: 300, quantityUnit: 'g', servingG: null },
    { food, quantity: 4, quantityUnit: 'serving', servingG: 50 },
  ],
};

function kcal(meal: SavedMeal['items']) {
  return meal.reduce(
    (sum, i) => sum + entryNutrition(i.food, i.quantity, i.quantityUnit, i.servingG).calories_kcal,
    0
  );
}

describe('scaleSavedMealItems', () => {
  it('keeps the amounts when all portions are eaten', () => {
    expect(scaleSavedMealItems(pancakes, 12)).toEqual(pancakes.items);
    const meal = { ...pancakes, portions: 1 };
    expect(scaleSavedMealItems(meal, 1)).toEqual(meal.items);
  });

  it('scales gram and serving items to 2.5 of 12, keeping the serving size', () => {
    const [grams, servings] = scaleSavedMealItems(pancakes, 2.5);
    expect(grams).toEqual({ food, quantity: 62.5, quantityUnit: 'g', servingG: null });
    expect(servings.quantity).toBeCloseTo((4 * 2.5) / 12);
    expect(servings.quantityUnit).toBe('serving');
    expect(servings.servingG).toBe(50);
  });

  it('gives that share of the total kcal', () => {
    expect(kcal(scaleSavedMealItems(pancakes, 2.5))).toBeCloseTo((kcal(pancakes.items) * 2.5) / 12);
  });
});
