import { AIWeights } from './engine/types';

/**
 * Trained AI weights from evolutionary self-play (200 pop × 500 gen).
 * To retrain: `npm run train` → copy values from weights.json here.
 */
export const AI_WEIGHTS: AIWeights = {
  weights: [
    0.007315789272935934,
    -2.5865560083875856,
    1.2712639464627167,
    0.7312208885933412,
    0.06829298821242863,
    -0.20615431732703804,
    -0.07023476517117581,
    -0.7503747974701863,
    -0.0003411109449890032,
    0.7752203008703882,
    0.6669501746392459,
    -0.015186979589601201,
  ],
  threshold: 0.5884514594736984,
};
