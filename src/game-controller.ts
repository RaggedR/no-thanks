import { GameState } from './engine/types';
import { createGame, applyAction, getValidActions, isGameOver } from './engine/game';
import { calculateScore } from './engine/scoring';
import { decide } from './ai/agent';
import { AI_WEIGHTS } from './weights';
import type { ClientView, ActionLogEntry } from './types';

const HUMAN_PLAYER = 0;
const AI_NAMES = ['', 'AI 1', 'AI 2'];

interface GameResult {
  state: GameState;
  view: ClientView;
}

function toClientView(
  state: GameState,
  actionLog: ActionLogEntry[] = []
): ClientView {
  const human = state.players[HUMAN_PLAYER];
  const opponents = state.players
    .filter((p) => p.id !== HUMAN_PLAYER)
    .map((p) => ({
      id: p.id,
      name: AI_NAMES[p.id],
      cards: [...p.cards],
      chipCount: state.phase === 'finished' ? String(p.chips) : '???',
    }));

  const view: ClientView = {
    you: {
      chips: human.chips,
      cards: [...human.cards],
      score: calculateScore(human),
    },
    opponents,
    currentCard: state.currentCard,
    chipsOnCard: state.chipsOnCard,
    phase: state.phase,
    isYourTurn:
      state.phase === 'playing' &&
      state.currentPlayerIndex === HUMAN_PLAYER,
    validActions:
      state.currentPlayerIndex === HUMAN_PLAYER
        ? getValidActions(state)
        : [],
    actionLog,
  };

  if (state.phase === 'finished') {
    const scores = state.players
      .map((p) => ({
        id: p.id,
        name: p.id === 0 ? 'You' : AI_NAMES[p.id],
        score: calculateScore(p),
      }))
      .sort((a, b) => a.score - b.score)
      .map((s, i) => ({ ...s, rank: i + 1 }));
    view.finalScores = scores;
  }

  return view;
}

/**
 * Resolve all AI turns until it's the human's turn again (or game ends).
 * Builds up the actionLog for the client to animate.
 */
function resolveAITurns(
  state: GameState,
  actionLog: ActionLogEntry[]
): GameState {
  let current = state;
  let safety = 0;

  while (
    !isGameOver(current) &&
    current.currentPlayerIndex !== HUMAN_PLAYER &&
    safety < 200
  ) {
    const aiIndex = current.currentPlayerIndex;
    const aiName = AI_NAMES[aiIndex];
    const action = decide(current, aiIndex, AI_WEIGHTS);

    if (action === 'take') {
      const card = current.currentCard!;
      const chipsCollected = current.chipsOnCard;
      current = applyAction(current, 'take');
      const newCard = current.currentCard;

      actionLog.push({
        playerId: aiIndex,
        player: aiName,
        action: 'take',
        card,
        chipsCollected,
        newCard: newCard ?? undefined,
        chipsOnCardAfter: 0,
        opponentCardsAfter: [...current.players[aiIndex].cards],
      });
    } else {
      current = applyAction(current, 'pass');
      actionLog.push({
        playerId: aiIndex,
        player: aiName,
        action: 'pass',
        chipsOnCardAfter: current.chipsOnCard,
      });
    }

    safety++;
  }

  return current;
}

/** Start a new game. Returns internal state + client view. */
export function newGame(): GameResult {
  const state = createGame(3);
  const actionLog: ActionLogEntry[] = [];
  const resolved = resolveAITurns(state, actionLog);
  return { state: resolved, view: toClientView(resolved, actionLog) };
}

/** Apply a human action, then resolve AI turns. Returns updated state + client view. */
export function humanAction(
  state: GameState,
  action: 'take' | 'pass'
): GameResult {
  let current = applyAction(state, action);
  const actionLog: ActionLogEntry[] = [];
  current = resolveAITurns(current, actionLog);
  return { state: current, view: toClientView(current, actionLog) };
}
