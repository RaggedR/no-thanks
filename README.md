# No Thanks! — AI Card Game

A web implementation of the card game **No Thanks!** where you play against two AI opponents trained through evolutionary self-play. The AI learns optimal strategy by playing millions of games against itself. Runs entirely in the browser — no server needed.

**Play now:** https://raggedr.github.io/no-thanks/

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Browser (TypeScript) |
| **Frontend** | React + Vite |
| **Game Logic** | Pure TypeScript functions running client-side |
| **AI Training** | Evolutionary algorithm (runs locally via Node.js, outputs weights) |
| **Deployment** | GitHub Pages (static site) |

## How the AI Works

### Evaluation Function

Each time the AI faces a decision (take the card or pass), it extracts 12 normalized features from the game state and computes a weighted sum. If the sum exceeds a learned threshold, it passes; below it, it takes the card.

| # | Feature | Range | Description |
|---|---------|-------|-------------|
| 0 | `cardValue` | 0–1 | Current card value, normalized: `(value - 3) / 32` |
| 1 | `chipsOnCard` | 0–1 | Chips accumulated on the current card: `chips / 33` |
| 2 | `netCost` | −1–1 | Effective price: `(cardValue - chipsOnCard)`, normalized |
| 3 | `myChips` | 0–1 | AI's remaining chips: `chips / 11` |
| 4 | `extendsRun` | 0 or 1 | Whether the card is adjacent to an existing held card |
| 5 | `fillsGap` | 0 or 1 | Whether the card bridges two held cards (e.g., holding 20 & 22, card is 21) |
| 6 | `distanceToNearest` | 0–1 | Minimum distance to any held card: `distance / 32` (1.0 if no cards held) |
| 7 | `cardsRemaining` | 0–1 | Fraction of deck remaining: `deckSize / 24` |
| 8 | `scoreDelta` | −1–1 | AI's current score minus best opponent's score, normalized |
| 9 | `scoreChange` | −1–1 | **Exact** score delta if the card is taken (including all run effects) |
| 10 | `chipUrgency` | 0–1 | Non-linear chip pressure: `1 - (chips/11)^0.5` |
| 11 | `runSavings` | 0–1 | Points saved by extending an existing run |

Feature 9 (`scoreChange`) was the breakthrough — it computes the actual score impact of taking the card including all run formation effects. This single feature took the AI from 67% to **99.9% win rate** against random agents.

The decision:

```
score = w₀·cardValue + w₁·chipsOnCard + ... + w₁₁·runSavings

if score < threshold → take the card
else → pass (say "No Thanks!")
```

### Evolutionary Training Algorithm

The AI's weights are learned through an evolutionary algorithm — no neural networks, no gradient descent. Just natural selection.

1. **Initialize**: Create a population of 200 individuals, each with random weights in [−1, 1] and a random threshold
2. **Evaluate fitness**: Each individual plays 50 complete 3-player games against random opponents from the population. Scoring: 1st place = 3 pts, 2nd place = 1 pt, 3rd place = 0 pts
3. **Selection**: The top 20% (40 individuals) survive to the next generation
4. **Reproduction**: Fill the remaining 160 slots by:
   - Picking 2 random survivors as parents
   - Uniform crossover: each weight has a 50% chance of coming from either parent
   - Mutation: each weight has a 30% chance of being perturbed by Gaussian noise (σ = 0.1)
5. **Repeat** for 500 generations
6. **Output**: The best individual's weights are saved to `weights.json`

This runs approximately 5 million games total (200 × 50 × 500). Since each game is pure arithmetic (~24 turns of dot products), training completes in under a minute on modern hardware.

### Train Locally, Deploy Trained Weights

Training happens on your local machine — it never runs in production.

```bash
# Train the AI (produces weights.json)
npx tsx src/ai/train.ts

# Validates against random agents — trained AI wins ~99.9%
# Training logs fitness per generation + periodic validation vs random
```

The generated `weights.json` is committed to the repo. After retraining, copy the 13 numbers into `src/weights.ts`.

## State Management

The game state lives entirely in the browser. A `useRef<GameState>` in React holds the full internal state, while the rendered UI sees only a projected `ClientView`.

### What the game state holds (full state)
- All players' cards and exact chip counts
- The deck order (remaining face-down cards)
- Which 9 cards were removed at setup

### What the UI sees (projected view)
- The human player's own cards, chips, and score
- AI opponents' cards (visible, as in the physical game)
- AI opponents' chip counts: **hidden** (shown as "???")
- The current face-up card and chips on it
- An action log of what the AIs did on their turns

### Turn flow

When the human submits an action, the game controller:
1. Applies the human's action (take or pass)
2. Runs all subsequent AI turns until it's the human's turn again
3. Returns the updated client view + an **action log**

The UI then **animates through the action log** with timed delays (brief "thinking..." pauses for each AI), giving the feel of playing against real opponents. Buttons are disabled during AI turns.

This means:
- **Zero network requests during gameplay** — everything runs locally
- **Instant responses** — no latency, no loading spinners
- **Works offline** — once loaded, no internet connection needed

## Game Rules

**No Thanks!** is a card game for 3–7 players where the goal is the **lowest score**.

- **Cards**: Numbered 3–35. Nine cards are randomly removed face-down at setup (unknown to players).
- **Chips**: Each player starts with 11 chips.
- **On your turn**: Either **take the card** (add its value to your score, collect all chips on it) or **say "No Thanks!"** (place one of your chips on the card). If you have 0 chips, you must take.
- **Runs**: Consecutive cards in your hand form a run — only the **lowest card** in a run counts. (Holding 8, 9, 10 = 8 points, not 27.)
- **Scoring**: Sum of card values (with runs) **minus** remaining chips. **Lowest score wins.**

## Development

```bash
# Install dependencies
npm install

# Start dev server (Vite with HMR)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Deployment (GitHub Pages)

Push to `main` and GitHub Actions automatically builds and deploys to GitHub Pages.

No environment variables or secrets needed. The trained weights are hardcoded in `src/weights.ts`. The app is entirely self-contained.
