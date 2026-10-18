import { formatRest, restFromMinSec, splitRest } from '../restTime';

describe('restFromMinSec', () => {
  it('adds minutes and seconds', () => {
    expect(restFromMinSec('3', '00', 5)).toBe(180);
    expect(restFromMinSec('1', '30', 5)).toBe(90);
    expect(restFromMinSec('0', '75', 5)).toBe(75);
    expect(restFromMinSec('1,5', '', 5)).toBe(90);
  });

  it('treats empty or junk boxes as 0 and clamps to the limits', () => {
    expect(restFromMinSec('', '', 5)).toBe(5);
    expect(restFromMinSec('abc', '10', 15)).toBe(15);
    expect(restFromMinSec('12', '00', 5)).toBe(600);
    expect(restFromMinSec('10', '01', 15)).toBe(600);
  });
});

describe('splitRest / formatRest', () => {
  it('splits seconds into boxes and formats m:ss', () => {
    expect(splitRest(180)).toEqual({ minutes: '3', seconds: '00' });
    expect(splitRest(65)).toEqual({ minutes: '1', seconds: '05' });
    expect(formatRest(90)).toBe('1:30');
    expect(formatRest(600)).toBe('10:00');
  });
});
