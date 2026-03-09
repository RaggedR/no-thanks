import { PlayerState } from './types';

/**
 * Detect consecutive runs in a sorted array of cards.
 * e.g., [3,4,5,8,9,15] → [[3,4,5],[8,9],[15]]
 */
export function detectRuns(cards: number[]): number[][] {
  if (cards.length === 0) return [];

  const sorted = [...cards].sort((a, b) => a - b);
  const runs: number[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      runs[runs.length - 1].push(sorted[i]);
    } else {
      runs.push([sorted[i]]);
    }
  }

  return runs;
}

/**
 * Calculate a player's score. In No Thanks!:
 * - Each run of consecutive cards scores only the lowest card value
 * - Remaining chips subtract from the score
 * - Lowest score wins
 */
export function calculateScore(player: PlayerState): number {
  const runs = detectRuns(player.cards);
  const cardScore = runs.reduce((sum, run) => sum + run[0], 0);
  return cardScore - player.chips;
}

/**
 * Return players sorted by score ascending (lowest = winner).
 */
export function getRankings(players: PlayerState[]): PlayerState[] {
  return [...players].sort(
    (a, b) => calculateScore(a) - calculateScore(b)
  );
}
