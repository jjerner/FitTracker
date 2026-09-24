export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Food = {
  id: string;
  source: 'off' | 'custom';
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number | null;
  servingDescription: string | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

export type FoodLogEntry = {
  id: string;
  foodId: string;
  foodName: string;
  loggedDate: string;
  mealType: MealType;
  quantity: number;
  quantityUnit: 'g' | 'serving';
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

export type NutritionGoals = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};
