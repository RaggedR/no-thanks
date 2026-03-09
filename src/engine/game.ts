import { GameState, PlayerState, Action } from './types';

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Create a new game for the given number of players.
 * - Cards 3–35 (33 cards), remove 9 randomly
 * - Each player gets 11 chips
 * - First card is flipped from the shuffled deck
 */
export function createGame(numPlayers: number): GameState {
  // Generate and shuffle all cards 3–35
  const allCards: number[] = [];
  for (let i = 3; i <= 35; i++) allCards.push(i);
  const shuffled = shuffle(allCards);

  // Remove 9 cards (face down, unknown to all)
  const remaining = shuffled.slice(9);

  // Flip the first card
  const deck = remaining.slice(1);
  const currentCard = remaining[0];

  // Create players
  const players: PlayerState[] = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({ id: i, chips: 11, cards: [] });
  }

  return {
    players,
    currentPlayerIndex: 0,
    currentCard,
    chipsOnCard: 0,
    deck,
    phase: 'playing',
  };
}

/**
 * Get valid actions for the current player.
 * - Always can take
 * - Can pass only if they have chips
 */
export function getValidActions(state: GameState): Action[] {
  if (state.phase === 'finished' || state.currentCard === null) return [];
  const player = state.players[state.currentPlayerIndex];
  const actions: Action[] = ['take'];
  if (player.chips > 0) actions.push('pass');
  return actions;
}

/**
 * Apply an action to the game state, returning a new state (immutable).
 */
export function applyAction(state: GameState, action: Action): GameState {
  if (state.phase === 'finished' || state.currentCard === null) return state;

  const players = state.players.map((p) => ({ ...p, cards: [...p.cards] }));
  const currentPlayer = players[state.currentPlayerIndex];

  if (action === 'take') {
    // Player takes the card and all chips on it
    currentPlayer.cards.push(state.currentCard);
    currentPlayer.cards.sort((a, b) => a - b);
    currentPlayer.chips += state.chipsOnCard;

    // Flip next card or end game
    if (state.deck.length === 0) {
      return {
        players,
        currentPlayerIndex: state.currentPlayerIndex,
        currentCard: null,
        chipsOnCard: 0,
        deck: [],
        phase: 'finished',
      };
    }

    const newDeck = [...state.deck];
    const nextCard = newDeck.shift()!;

    return {
      players,
      currentPlayerIndex: state.currentPlayerIndex, // same player goes again after taking
      currentCard: nextCard,
      chipsOnCard: 0,
      deck: newDeck,
      phase: 'playing',
    };
  } else {
    // Pass: lose 1 chip, chip goes on the card
    currentPlayer.chips -= 1;
    const nextPlayerIndex =
      (state.currentPlayerIndex + 1) % state.players.length;

    return {
      players,
      currentPlayerIndex: nextPlayerIndex,
      currentCard: state.currentCard,
      chipsOnCard: state.chipsOnCard + 1,
      deck: [...state.deck],
      phase: 'playing',
    };
  }
}

/**
 * Check if the game is over.
 */
export function isGameOver(state: GameState): boolean {
  return state.phase === 'finished';
}
