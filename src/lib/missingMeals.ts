import type { MealType } from '../types/domain';

// Meals the 20:30 reminder checks. Snacks are left out on purpose.
const MAIN_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];

export function missingMeals(logged: MealType[]): MealType[] {
  return MAIN_MEALS.filter((meal) => !logged.includes(meal));
}

// "You haven't logged lunch or dinner today."
export function missingMealsMessage(missing: MealType[]): string {
  const names =
    missing.length <= 1
      ? missing.join('')
      : `${missing.slice(0, -1).join(', ')} or ${missing[missing.length - 1]}`;
  return `You haven't logged ${names} today.`;
}
