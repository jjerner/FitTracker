import { missingMealsMessage } from '../reminders';

// reminders.ts talks to the phone and Supabase; the message is plain logic.
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('../supabase', () => ({ supabase: {} }));
jest.mock('../settings', () => ({}));

describe('missingMealsMessage', () => {
  it('names all three main meals when nothing is logged', () => {
    expect(missingMealsMessage(new Set())).toBe('Nothing logged for breakfast, lunch and dinner yet.');
  });

  it('ignores snacks and names the missing ones', () => {
    expect(missingMealsMessage(new Set(['snack', 'breakfast']))).toBe('Nothing logged for lunch and dinner yet.');
    expect(missingMealsMessage(new Set(['breakfast', 'lunch']))).toBe('Nothing logged for dinner yet.');
  });

  it('returns null when every main meal has food', () => {
    expect(missingMealsMessage(new Set(['breakfast', 'lunch', 'dinner']))).toBeNull();
  });
});
