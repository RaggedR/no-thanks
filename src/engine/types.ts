export interface PlayerState {
  id: number;
  chips: number;
  cards: number[]; // sorted ascending
}

export interface GameState {
  players: PlayerState[];
  currentPlayerIndex: number;
  currentCard: number | null;
  chipsOnCard: number;
  deck: number[]; // remaining face-down cards
  phase: 'playing' | 'finished';
}

export type Action = 'take' | 'pass';

export interface AIWeights {
  weights: number[]; // 9 feature weights
  threshold: number; // take if dot product > threshold
}
