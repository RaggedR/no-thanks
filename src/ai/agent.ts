import { GameState, Action, AIWeights } from '../engine/types';
import { getValidActions } from '../engine/game';
import { extractFeatures } from './features';

/**
 * AI decision function. Computes dot product of features × weights,
 * and takes the card if the result exceeds the threshold.
 * Falls back to 'take' if the player has no chips (forced).
 */
export function decide(
  state: GameState,
  playerIndex: number,
  weights: AIWeights
): Action {
  const validActions = getValidActions(state);

  // If only one valid action, must do it
  if (validActions.length === 1) return validActions[0];

  const features = extractFeatures(state, playerIndex);

  // Dot product of features and weights
  let score = 0;
  for (let i = 0; i < features.length; i++) {
    score += features[i] * weights.weights[i];
  }

  // Below threshold → take the card (lower score = more desirable to take)
  // Above threshold → pass (save chips, wait for better opportunity)
  return score < weights.threshold ? 'take' : 'pass';
}
