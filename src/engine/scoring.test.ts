import { describe, it, expect } from 'vitest';
import { detectRuns, calculateScore, getRankings } from './scoring';
import { PlayerState } from './types';

describe('detectRuns', () => {
  it('returns empty for empty cards', () => {
    expect(detectRuns([])).toEqual([]);
  });

  it('detects single cards as individual runs', () => {
    expect(detectRuns([5, 10, 20])).toEqual([[5], [10], [20]]);
  });

  it('detects a single run', () => {
    expect(detectRuns([3, 4, 5, 6])).toEqual([[3, 4, 5, 6]]);
  });

  it('detects multiple runs', () => {
    expect(detectRuns([3, 4, 5, 8, 9, 15])).toEqual([
      [3, 4, 5],
      [8, 9],
      [15],
    ]);
  });

  it('handles unsorted input', () => {
    expect(detectRuns([9, 5, 3, 4, 15, 8])).toEqual([
      [3, 4, 5],
      [8, 9],
      [15],
    ]);
  });

  it('handles single card', () => {
    expect(detectRuns([17])).toEqual([[17]]);
  });

  it('handles full sequence 3-35', () => {
    const cards = Array.from({ length: 33 }, (_, i) => i + 3);
    expect(detectRuns(cards)).toEqual([cards]);
  });
});

describe('calculateScore', () => {
  it('scores single cards minus chips', () => {
    const player: PlayerState = { id: 0, chips: 5, cards: [10, 20] };
    // Runs: [10], [20] → scores 10 + 20 = 30, minus 5 chips = 25
    expect(calculateScore(player)).toBe(25);
  });

  it('runs score only the lowest card', () => {
    const player: PlayerState = { id: 0, chips: 3, cards: [10, 11, 12, 20] };
    // Runs: [10,11,12], [20] → scores 10 + 20 = 30, minus 3 chips = 27
    expect(calculateScore(player)).toBe(27);
  });

  it('handles no cards', () => {
    const player: PlayerState = { id: 0, chips: 11, cards: [] };
    // 0 card score - 11 chips = -11
    expect(calculateScore(player)).toBe(-11);
  });

  it('handles zero chips', () => {
    const player: PlayerState = { id: 0, chips: 0, cards: [35] };
    expect(calculateScore(player)).toBe(35);
  });

  it('long run is highly beneficial', () => {
    const withRun: PlayerState = { id: 0, chips: 0, cards: [20, 21, 22, 23, 24, 25] };
    const withoutRun: PlayerState = { id: 1, chips: 0, cards: [20, 22, 24] };
    // With run: just 20. Without run: 20+22+24=66
    expect(calculateScore(withRun)).toBe(20);
    expect(calculateScore(withoutRun)).toBe(66);
  });
});

describe('getRankings', () => {
  it('sorts by score ascending (lowest = winner)', () => {
    const players: PlayerState[] = [
      { id: 0, chips: 0, cards: [30, 31, 32] }, // score: 30
      { id: 1, chips: 5, cards: [10] },          // score: 5
      { id: 2, chips: 2, cards: [20, 25] },      // score: 43
    ];
    const ranked = getRankings(players);
    expect(ranked[0].id).toBe(1); // lowest score wins
    expect(ranked[1].id).toBe(0);
    expect(ranked[2].id).toBe(2);
  });
});
