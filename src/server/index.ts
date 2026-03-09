import express from 'express';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { GameState, AIWeights } from '../engine/types';
import {
  createGame,
  applyAction,
  getValidActions,
  isGameOver,
} from '../engine/game';
import { calculateScore } from '../engine/scoring';
import { decide } from '../ai/agent';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Load AI weights
const weightsPath = path.join(process.cwd(), 'weights.json');
let aiWeights: AIWeights;
try {
  aiWeights = JSON.parse(fs.readFileSync(weightsPath, 'utf-8'));
  console.log('Loaded AI weights from weights.json');
} catch {
  console.warn('No weights.json found — using default weights');
  aiWeights = {
    weights: [0.5, -0.8, 0.6, -0.3, -0.9, -1.0, 0.4, 0.1, 0.3, -0.5, 0.3, -0.7],
    threshold: -0.1,
  };
}

// In-memory game sessions
const sessions = new Map<string, GameState>();

// Human player is always index 0
const HUMAN_PLAYER = 0;
const AI_NAMES = ['', 'AI 1', 'AI 2'];

interface ActionLogEntry {
  playerId: number;
  player: string;
  action: 'pass' | 'take';
  card?: number;
  chipsCollected?: number;
  newCard?: number;
  chipsOnCardAfter?: number;
  opponentCardsAfter?: number[];
}

interface ClientView {
  you: { chips: number; cards: number[]; score: number };
  opponents: { id: number; name: string; cards: number[]; chipCount: string }[];
  currentCard: number | null;
  chipsOnCard: number;
  phase: 'playing' | 'finished';
  isYourTurn: boolean;
  validActions: string[];
  actionLog: ActionLogEntry[];
  finalScores?: { id: number; name: string; score: number; rank: number }[];
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

function getSessionId(req: express.Request, res: express.Response): string {
  let sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  return sessionId;
}

// Create a new game
app.post('/api/game/new', (req, res) => {
  const sessionId = getSessionId(req, res);
  const state = createGame(3);
  sessions.set(sessionId, state);

  // If AI goes first (shouldn't happen since human is always player 0, but just in case)
  const actionLog: ActionLogEntry[] = [];
  let current = state;
  current = resolveAITurns(current, actionLog);
  sessions.set(sessionId, current);

  res.json(toClientView(current, actionLog));
});

// Submit a human action
app.post('/api/game/action', (req, res) => {
  const sessionId = getSessionId(req, res);
  const state = sessions.get(sessionId);

  if (!state) {
    res.status(404).json({ error: 'No active game. Start a new one.' });
    return;
  }

  if (state.phase === 'finished') {
    res.status(400).json({ error: 'Game is already over.' });
    return;
  }

  if (state.currentPlayerIndex !== HUMAN_PLAYER) {
    res.status(400).json({ error: 'Not your turn.' });
    return;
  }

  const { action } = req.body;
  if (action !== 'take' && action !== 'pass') {
    res.status(400).json({ error: 'Invalid action. Use "take" or "pass".' });
    return;
  }

  const validActions = getValidActions(state);
  if (!validActions.includes(action)) {
    res.status(400).json({ error: `Cannot ${action} right now.` });
    return;
  }

  // Apply human action
  let current = applyAction(state, action);

  // Resolve AI turns
  const actionLog: ActionLogEntry[] = [];
  current = resolveAITurns(current, actionLog);

  sessions.set(sessionId, current);
  res.json(toClientView(current, actionLog));
});

// Get current game state
app.get('/api/game/state', (req, res) => {
  const sessionId = getSessionId(req, res);
  const state = sessions.get(sessionId);

  if (!state) {
    res.status(404).json({ error: 'No active game. Start a new one.' });
    return;
  }

  res.json(toClientView(state));
});

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
    const action = decide(current, aiIndex, aiWeights);

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

// Serve static React build in production
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`No Thanks! server running on http://localhost:${PORT}`);
});
