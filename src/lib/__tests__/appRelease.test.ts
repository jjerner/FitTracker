import { isNewer } from '../appRelease';

jest.mock('../supabase', () => ({ supabase: {} }));

describe('isNewer', () => {
  it('is true when the newest release has a higher build number', () => {
    expect(isNewer('5', { versionCode: 6 })).toBe(true);
  });

  it('is false when the app is on the same or a newer build', () => {
    expect(isNewer('6', { versionCode: 6 })).toBe(false);
    expect(isNewer('7', { versionCode: 6 })).toBe(false);
  });

  it('is false when either value is missing or the build number is not a number', () => {
    expect(isNewer(null, { versionCode: 6 })).toBe(false);
    expect(isNewer('5', null)).toBe(false);
    expect(isNewer('abc', { versionCode: 6 })).toBe(false);
  });
});
