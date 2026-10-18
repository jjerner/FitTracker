import { toNumberOrNull } from '../numbers';

describe('toNumberOrNull', () => {
  it('parses a decimal comma or dot', () => {
    expect(toNumberOrNull('12,5')).toBe(12.5);
    expect(toNumberOrNull('12,')).toBe(12);
    expect(toNumberOrNull('12.5')).toBe(12.5);
    expect(toNumberOrNull('0')).toBe(0);
  });

  it('returns null for empty or non-numeric text', () => {
    expect(toNumberOrNull('')).toBeNull();
    expect(toNumberOrNull('  ')).toBeNull();
    expect(toNumberOrNull('abc')).toBeNull();
    expect(toNumberOrNull('Infinity')).toBeNull();
    expect(toNumberOrNull('1,2,3')).toBeNull();
  });
});
