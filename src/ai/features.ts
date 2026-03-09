import { GameState, PlayerState } from '../engine/types';
import { calculateScore } from '../engine/scoring';

/**
 * Extract 12 normalized features from the game state for a given player.
 * These features capture the key strategic considerations in No Thanks!
 */
export function extractFeatures(
  state: GameState,
  playerIndex: number
): number[] {
  const player = state.players[playerIndex];
  const card = state.currentCard!;

  // Feature 0: Card value normalized (0–1)
  const cardValue = (card - 3) / 32;

  // Feature 1: Chips on card normalized (0–1)
  const chipsOnCard = state.chipsOnCard / 33;

  // Feature 2: Net cost — how expensive is this card after chips offset (-1 to 1)
  const netCost = (card - state.chipsOnCard) / 35;

  // Feature 3: My remaining chips (0–1)
  const myChips = player.chips / 11;

  // Feature 4: Does this card extend an existing run? (0 or 1)
  const extendsRun = player.cards.some(
    (c) => Math.abs(c - card) === 1
  )
    ? 1
    : 0;

  // Feature 5: Does this card fill a gap between two held cards? (0 or 1)
  const fillsGap =
    player.cards.includes(card - 1) && player.cards.includes(card + 1)
      ? 1
      : 0;

  // Feature 6: Distance to nearest held card (0–1), 1.0 if no cards
  let distanceToNearest: number;
  if (player.cards.length === 0) {
    distanceToNearest = 1.0;
  } else {
    const minDist = Math.min(...player.cards.map((c) => Math.abs(c - card)));
    distanceToNearest = minDist / 32;
  }

  // Feature 7: Cards remaining in deck (0–1)
  const cardsRemaining = state.deck.length / 24;

  // Feature 8: Score delta — positive means I'm behind (worse), negative means ahead
  const myScore = calculateScore(player);
  const opponentScores = state.players
    .filter((_, i) => i !== playerIndex)
    .map((p) => calculateScore(p));
  const bestOpponentScore = Math.min(...opponentScores);
  const rawDelta = (myScore - bestOpponentScore) / 35;
  const scoreDelta = Math.max(-1, Math.min(1, rawDelta));

  // Feature 9: ACTUAL score change from taking this card (the most powerful feature)
  // This captures all run logic in a single number
  const hypotheticalCards = [...player.cards, card].sort((a, b) => a - b);
  const hypotheticalPlayer: PlayerState = {
    ...player,
    cards: hypotheticalCards,
    chips: player.chips + state.chipsOnCard,
  };
  const scoreIfTake = calculateScore(hypotheticalPlayer);
  const scoreNow = calculateScore(player);
  // Negative means taking improves score, positive means it hurts
  const scoreChange = Math.max(-1, Math.min(1, (scoreIfTake - scoreNow) / 35));

  // Feature 10: Chip urgency — non-linear pressure as chips run low
  // At 11 chips: 0.0, at 1 chip: ~0.83, at 0 chips: 1.0
  const chipUrgency = 1 - (player.chips / 11) ** 0.5;

  // Feature 11: Run savings — how much score an adjacent run saves
  // If card extends a run of 5, that's worth ~5 points in savings vs a standalone card
  const runSavings = extendsRun
    ? computeRunSavings(player.cards, card) / 32
    : 0;

  return [
    cardValue,
    chipsOnCard,
    netCost,
    myChips,
    extendsRun,
    fillsGap,
    distanceToNearest,
    cardsRemaining,
    scoreDelta,
    scoreChange,
    chipUrgency,
    runSavings,
  ];
}

/**
 * Compute how much score is saved by extending an existing run.
 * If holding [10,11,12] and card is 13, taking it adds 0 to score (run absorbs it).
 * A standalone 13 would cost 13 points. So savings = 13.
 */
function computeRunSavings(cards: number[], newCard: number): number {
  // Score with card minus what the card would cost standalone
  const withCard = [...cards, newCard].sort((a, b) => a - b);
  const withoutCard = [...cards];

  // Calculate score difference (both without chips, just card scoring)
  const scoreWith = runScore(withCard);
  const scoreWithout = runScore(withoutCard);

  // The card "costs" its face value if standalone. The actual cost is the score increase.
  const actualCost = scoreWith - scoreWithout;
  const savings = newCard - actualCost;
  return Math.max(0, savings);
}

function runScore(cards: number[]): number {
  if (cards.length === 0) return 0;
  const sorted = [...cards].sort((a, b) => a - b);
  let score = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      score += sorted[i];
    }
  }
  return score;
}

export const NUM_FEATURES = 12;
