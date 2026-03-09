# CLAUDE.md — No Thanks! AI Card Game

## What This Is
Web app where a human plays No Thanks! against 2 AI opponents trained via evolutionary self-play. Single container: Express serves API + React static build.

## Project Structure
```
src/engine/          # Game state machine (pure, immutable, no side effects)
  types.ts           # GameState, PlayerState, Action, AIWeights interfaces
  game.ts            # createGame, applyAction, getValidActions, isGameOver
  scoring.ts         # detectRuns, calculateScore, getRankings
  *.test.ts          # Vitest unit tests (31 tests)

src/ai/              # AI decision-making + training
  features.ts        # 12-feature extraction from game state (NUM_FEATURES exported)
  agent.ts           # decide() — dot product of features × weights vs threshold
  train.ts           # Evolutionary training CLI (200 pop × 500 gen)

src/server/          # Express API server
  index.ts           # Routes: POST /api/game/new, POST /api/game/action, GET /api/game/state
                     # In-memory sessions (Map keyed by cookie sessionId)
                     # Loads weights.json at startup
                     # Serves client/dist/ in production

client/              # React + Vite frontend
  src/App.tsx        # State management, API calls, animation sequencing
  src/components/    # GameBoard, Card, ChipPile, PlayerHand, OpponentZone, GameOver
  src/styles/game.css
  vite.config.ts     # Proxies /api to Express in dev

weights.json         # Trained AI weights (12 weights + 1 threshold)
Dockerfile           # Multi-stage: build client → compile server → slim runtime
```

## Commands
```bash
npm install && cd client && npm install && cd ..   # Install deps
npm run dev              # Concurrent dev: Express (tsx watch :3000) + Vite (:5173)
npm run build            # Production: tsc server + vite build client
npm start                # Serve production build on :3000
npm test                 # Vitest (31 tests for engine)
npm run train            # Retrain AI (~10 min, writes weights.json)
```

## Deploy
```bash
gcloud run deploy no-thanks --source . --region australia-southeast1 --allow-unauthenticated
```
Currently deployed to `melb-tech-prod` project. No env vars or secrets needed — fully self-contained.

## Architecture Notes

### Game Engine
- **Immutable state machine**: `applyAction()` returns a new `GameState`, never mutates
- Cards 3–35 (33 total), 9 removed randomly at start (hidden info), 11 chips per player
- Human is always player index 0

### AI
- Linear model: dot product of 12 features × weights, compared to threshold
- Key feature: `scoreChange` (feature 9) — computes exact score delta from taking a card including all run effects. This was the breakthrough feature (67% → 99.9% win rate vs random)
- Training uses external validation (vs truly random 50/50 agents) not in-population fitness to select best individual

### Frontend Animation
- "Replay log" pattern: server resolves all AI turns in one request, returns `actionLog` array
- Client animates through log with timed delays (chips sliding, cards moving)
- Uses `getBoundingClientRect()` + `position: fixed` overlay for flying elements
- Double `requestAnimationFrame` ensures browser paints start position before transitioning

### Session Management
- Cookie-based session ID (uuid), in-memory game state Map
- No database — state lives in server memory, lost on restart (fine for casual play)
