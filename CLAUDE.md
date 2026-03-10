# CLAUDE.md — No Thanks! AI Card Game

## What This Is
Browser-only web app where a human plays No Thanks! against 2 AI opponents trained via evolutionary self-play. No server — game engine and AI run entirely in the browser. Hosted on GitHub Pages.

## Project Structure
```
src/
  engine/              # Game state machine (pure, immutable, no side effects)
    types.ts           # GameState, PlayerState, Action, AIWeights interfaces
    game.ts            # createGame, applyAction, getValidActions, isGameOver
    scoring.ts         # detectRuns, calculateScore, getRankings
    *.test.ts          # Vitest unit tests (31 tests)

  ai/                  # AI decision-making + training
    features.ts        # 12-feature extraction from game state (NUM_FEATURES exported)
    agent.ts           # decide() — dot product of features × weights vs threshold
    train.ts           # Evolutionary training CLI (200 pop × 500 gen, Node.js only)

  components/          # React UI: GameBoard, Card, ChipPile, PlayerHand, OpponentZone, GameOver
  styles/game.css      # Navy/amber theme, card rings, animations

  App.tsx              # State management, animation sequencing, direct game-controller calls
  main.tsx             # React entry point
  types.ts             # ClientView, ActionLogEntry, FlyingElement interfaces
  game-controller.ts   # newGame(), humanAction() — extracted from old Express server
  weights.ts           # Hardcoded AI weights (12 weights + 1 threshold)
  vite-env.d.ts        # Vite type reference

index.html             # App shell (root, loaded by Vite)
vite.config.ts         # Vite config with base: '/no-thanks/' for GitHub Pages
vitest.config.ts       # Test config
weights.json           # Trained weights source file (used by train.ts)
```

## Commands
```bash
npm install              # Install deps (single package.json)
npm run dev              # Vite dev server with HMR
npm run build            # tsc + vite build → dist/
npm run preview          # Preview production build locally
npm test                 # Vitest (31 tests for engine)
npm run train            # Retrain AI (~10 min, writes weights.json)
```

## Deploy
Push to `main` → GitHub Actions builds and deploys to GitHub Pages.
Live at: `https://raggedr.github.io/no-thanks/`

## Architecture Notes

### Game Engine
- **Immutable state machine**: `applyAction()` returns a new `GameState`, never mutates
- Cards 3–35 (33 total), 9 removed randomly at start (hidden info), 11 chips per player
- Human is always player index 0

### AI
- Linear model: dot product of 12 features × weights, compared to threshold
- Key feature: `scoreChange` (feature 9) — computes exact score delta from taking a card including all run effects. This was the breakthrough feature (67% → 99.9% win rate vs random)
- Training uses external validation (vs truly random 50/50 agents) not in-population fitness to select best individual

### Client-Side Game Controller
- `game-controller.ts` exports `newGame()` and `humanAction()` — pure functions, no HTTP
- `App.tsx` holds `GameState` in a `useRef` and `ClientView` in React state
- All game logic runs synchronously in the browser — zero API calls during gameplay

### Frontend Animation
- "Replay log" pattern: game-controller resolves all AI turns, returns `actionLog` array
- Client animates through log with timed delays (chips sliding, cards moving)
- Uses `getBoundingClientRect()` + `position: fixed` overlay for flying elements
- Double `requestAnimationFrame` ensures browser paints start position before transitioning
