import { missingMeals, missingMealsMessage } from '../missingMeals';

describe('missingMeals', () => {
  it('lists all main meals when nothing is logged', () => {
    expect(missingMeals([])).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('ignores snacks', () => {
    expect(missingMeals(['snack', 'snack'])).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('keeps meal order and skips logged meals', () => {
    expect(missingMeals(['dinner', 'breakfast', 'breakfast'])).toEqual(['lunch']);
  });

  it('is empty when all main meals are logged', () => {
    expect(missingMeals(['lunch', 'dinner', 'breakfast'])).toEqual([]);
  });
});

describe('missingMealsMessage', () => {
  it('names one meal', () => {
    expect(missingMealsMessage(['dinner'])).toBe("You haven't logged dinner today.");
  });

  it('names two meals', () => {
    expect(missingMealsMessage(['lunch', 'dinner'])).toBe(
      "You haven't logged lunch or dinner today.",
    );
  });

  it('names three meals', () => {
    expect(missingMealsMessage(['breakfast', 'lunch', 'dinner'])).toBe(
      "You haven't logged breakfast, lunch or dinner today.",
    );
  });
});
