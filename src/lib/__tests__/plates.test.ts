import { platesPerSide } from '../plates';

describe('platesPerSide', () => {
  it('gives exact loads with the default 20 kg bar', () => {
    // Biggest plate first: 100 kg is 25 + 15 (not 20 + 20), 140 is 25 + 25 + 10.
    expect(platesPerSide(100)).toEqual({ perSide: [25, 15], leftoverKg: 0 });
    expect(platesPerSide(60)).toEqual({ perSide: [20], leftoverKg: 0 });
    expect(platesPerSide(140)).toEqual({ perSide: [25, 25, 10], leftoverKg: 0 });
    expect(platesPerSide(65)).toEqual({ perSide: [20, 2.5], leftoverKg: 0 });
  });

  it('handles decimals without float errors', () => {
    expect(platesPerSide(62.5)).toEqual({ perSide: [20, 1.25], leftoverKg: 0 });
    expect(platesPerSide(22.5)).toEqual({ perSide: [1.25], leftoverKg: 0 });
    expect(platesPerSide(47.5)).toEqual({ perSide: [10, 2.5, 1.25], leftoverKg: 0 });
  });

  it('is just the bar at or below the bar weight', () => {
    expect(platesPerSide(20)).toEqual({ perSide: [], leftoverKg: 0 });
    expect(platesPerSide(15)).toEqual({ perSide: [], leftoverKg: 0 });
    expect(platesPerSide(0)).toEqual({ perSide: [], leftoverKg: 0 });
  });

  it('reports the leftover when the weight cannot be loaded exactly', () => {
    expect(platesPerSide(101)).toEqual({ perSide: [25, 15], leftoverKg: 1 });
    expect(platesPerSide(61)).toEqual({ perSide: [20], leftoverKg: 1 });
    expect(platesPerSide(21)).toEqual({ perSide: [], leftoverKg: 1 });
    expect(platesPerSide(63)).toEqual({ perSide: [20, 1.25], leftoverKg: 0.5 });
  });

  it('uses a changed bar weight', () => {
    expect(platesPerSide(100, 15)).toEqual({ perSide: [25, 15, 2.5], leftoverKg: 0 });
    expect(platesPerSide(15, 15)).toEqual({ perSide: [], leftoverKg: 0 });
    expect(platesPerSide(40, 0)).toEqual({ perSide: [20], leftoverKg: 0 });
    expect(platesPerSide(30, 7.5)).toEqual({ perSide: [10, 1.25], leftoverKg: 0 });
  });

  it('returns null for invalid input', () => {
    expect(platesPerSide(NaN)).toBeNull();
    expect(platesPerSide(Infinity)).toBeNull();
    expect(platesPerSide(-10)).toBeNull();
    expect(platesPerSide(100, -5)).toBeNull();
    expect(platesPerSide(100, NaN)).toBeNull();
  });
});
