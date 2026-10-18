import type { SavedMealItem } from '../types/domain';

// Foods picked on the food page in recipe mode wait here until the Recipe screen takes them.
let pending: SavedMealItem[] = [];

export function addPendingRecipeItem(item: SavedMealItem) {
  pending.push(item);
}

export function takePendingRecipeItems(): SavedMealItem[] {
  const items = pending;
  pending = [];
  return items;
}
