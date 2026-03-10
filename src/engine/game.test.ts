import { describe, it, expect } from 'vitest';
import { createGame, getValidActions, applyAction, isGameOver } from './game';

describe('createGame', () => {
  it('creates game with correct number of players', () => {
    const state = createGame(3);
    expect(state.players).toHaveLength(3);
  });

  it('deals 11 chips to each player', () => {
    const state = createGame(3);
    state.players.forEach((p) => {
      expect(p.chips).toBe(11);
      expect(p.cards).toEqual([]);
    });
  });

  it('starts with 23 cards in deck (33 - 9 removed - 1 flipped)', () => {
    const state = createGame(3);
    expect(state.deck).toHaveLength(23);
    expect(state.currentCard).toBeGreaterThanOrEqual(3);
    expect(state.currentCard).toBeLessThanOrEqual(35);
  });

  it('starts in playing phase with player 0', () => {
    const state = createGame(3);
    expect(state.phase).toBe('playing');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.chipsOnCard).toBe(0);
  });
});

describe('getValidActions', () => {
  it('allows both take and pass when player has chips', () => {
    const state = createGame(3);
    const actions = getValidActions(state);
    expect(actions).toContain('take');
    expect(actions).toContain('pass');
  });

  it('only allows take when player has 0 chips', () => {
    const state = createGame(3);
    state.players[0].chips = 0;
    const actions = getValidActions(state);
    expect(actions).toEqual(['take']);
  });

  it('returns empty for finished game', () => {
    const state = createGame(3);
    state.phase = 'finished';
    expect(getValidActions(state)).toEqual([]);
  });
});

describe('applyAction', () => {
  it('taking adds card to player hand (sorted)', () => {
    const state = createGame(3);
    const card = state.currentCard!;
    const next = applyAction(state, 'take');
    expect(next.players[0].cards).toContain(card);
  });

  it('taking gives chips on card to player', () => {
    let state = createGame(3);
    // Put some chips on the card first
    state = { ...state, chipsOnCard: 5 };
    const chipsBefore = state.players[0].chips;
    const next = applyAction(state, 'take');
    expect(next.players[0].chips).toBe(chipsBefore + 5);
    expect(next.chipsOnCard).toBe(0);
  });

  it('taking flips a new card', () => {
    const state = createGame(3);
    const oldCard = state.currentCard;
    const next = applyAction(state, 'take');
    // New card should be different (unless only 1 card left with same value — impossible)
    expect(next.currentCard).not.toBe(oldCard);
    expect(next.deck.length).toBe(state.deck.length - 1);
  });

  it('taking keeps same player for next turn', () => {
    const state = createGame(3);
    const next = applyAction(state, 'take');
    expect(next.currentPlayerIndex).toBe(0);
  });

  it('passing costs 1 chip', () => {
    const state = createGame(3);
    const chipsBefore = state.players[0].chips;
    const next = applyAction(state, 'pass');
    expect(next.players[0].chips).toBe(chipsBefore - 1);
  });

  it('passing adds chip to card', () => {
    const state = createGame(3);
    const next = applyAction(state, 'pass');
    expect(next.chipsOnCard).toBe(1);
  });

  it('passing advances to next player', () => {
    const state = createGame(3);
    const next = applyAction(state, 'pass');
    expect(next.currentPlayerIndex).toBe(1);
  });

  it('passing wraps around players', () => {
    let state = createGame(3);
    state = { ...state, currentPlayerIndex: 2 };
    const next = applyAction(state, 'pass');
    expect(next.currentPlayerIndex).toBe(0);
  });

  it('game ends when last card is taken', () => {
    let state = createGame(3);
    // Empty the deck
    state = { ...state, deck: [] };
    const next = applyAction(state, 'take');
    expect(next.phase).toBe('finished');
    expect(next.currentCard).toBeNull();
  });

  it('immutability: original state not mutated', () => {
    const state = createGame(3);
    const originalChips = state.players[0].chips;
    applyAction(state, 'pass');
    expect(state.players[0].chips).toBe(originalChips);
    expect(state.chipsOnCard).toBe(0);
  });
});

describe('full game simulation', () => {
  it('can play a complete game with forced takes', () => {
    let state = createGame(3);
    let turns = 0;

    while (!isGameOver(state) && turns < 1000) {
      const actions = getValidActions(state);
      // Always pass if possible, otherwise take
      const action = actions.includes('pass') ? 'pass' : 'take';
      state = applyAction(state, action);
      turns++;
    }

    expect(state.phase).toBe('finished');
    expect(turns).toBeLessThan(1000);
    // All 24 cards should be distributed among players
    const totalCards = state.players.reduce((sum, p) => sum + p.cards.length, 0);
    expect(totalCards).toBe(24);
  });
});
