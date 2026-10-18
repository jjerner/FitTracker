import { addPendingRecipeItem, takePendingRecipeItems } from '../recipeDraft';
import type { SavedMealItem } from '../../types/domain';

const item = { food: { id: 'f1' }, quantity: 100, quantityUnit: 'g', servingG: null } as SavedMealItem;

describe('recipeDraft', () => {
  it('take returns the added items, then an empty list', () => {
    addPendingRecipeItem(item);
    addPendingRecipeItem({ ...item, quantity: 2 });
    expect(takePendingRecipeItems().map((i) => i.quantity)).toEqual([100, 2]);
    expect(takePendingRecipeItems()).toEqual([]);
  });
});
