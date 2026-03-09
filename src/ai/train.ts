import { AIWeights, GameState, Action } from '../engine/types';
import { createGame, applyAction, getValidActions, isGameOver } from '../engine/game';
import { calculateScore, getRankings } from '../engine/scoring';
import { decide } from './agent';
import { NUM_FEATURES } from './features';
import * as fs from 'fs';
import * as path from 'path';

const POPULATION_SIZE = 200;
const GAMES_PER_EVAL = 50;
const NUM_GENERATIONS = 500;
const SURVIVAL_RATE = 0.2;
const MUTATION_RATE = 0.3;
const MUTATION_STRENGTH = 0.15;

function randomWeight(): number {
  return Math.random() * 2 - 1; // [-1, 1]
}

function createRandomIndividual(): AIWeights {
  const weights: number[] = [];
  for (let i = 0; i < NUM_FEATURES; i++) {
    weights.push(randomWeight());
  }
  return { weights, threshold: randomWeight() };
}

function gaussianRandom(): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function mutate(individual: AIWeights): AIWeights {
  const weights = individual.weights.map((w) =>
    Math.random() < MUTATION_RATE ? w + gaussianRandom() * MUTATION_STRENGTH : w
  );
  const threshold =
    Math.random() < MUTATION_RATE
      ? individual.threshold + gaussianRandom() * MUTATION_STRENGTH
      : individual.threshold;
  return { weights, threshold };
}

function crossover(a: AIWeights, b: AIWeights): AIWeights {
  const weights = a.weights.map((w, i) =>
    Math.random() < 0.5 ? w : b.weights[i]
  );
  const threshold = Math.random() < 0.5 ? a.threshold : b.threshold;
  return { weights, threshold };
}

/**
 * Play a single game with 3 AI players, returns placement points.
 * 1st place = 3, 2nd = 1, 3rd = 0
 */
function playGame(agents: AIWeights[]): number[] {
  let state = createGame(3);
  let turns = 0;
  const maxTurns = 1000; // safety limit

  while (!isGameOver(state) && turns < maxTurns) {
    const playerIdx = state.currentPlayerIndex;
    const action = decide(state, playerIdx, agents[playerIdx]);
    state = applyAction(state, action);
    turns++;
  }

  // Score and rank
  const scores = state.players.map((p) => ({
    id: p.id,
    score: calculateScore(p),
  }));
  scores.sort((a, b) => a.score - b.score);

  const points = [0, 0, 0];
  points[scores[0].id] = 3; // 1st place
  points[scores[1].id] = 1; // 2nd place
  // 3rd place gets 0
  return points;
}

/**
 * Evaluate fitness of an individual by playing GAMES_PER_EVAL games
 * with random opponents from the population.
 */
function evaluateFitness(
  individual: AIWeights,
  population: AIWeights[]
): number {
  let totalPoints = 0;

  for (let g = 0; g < GAMES_PER_EVAL; g++) {
    // Pick 2 random opponents
    const opponents: AIWeights[] = [];
    for (let i = 0; i < 2; i++) {
      opponents.push(population[Math.floor(Math.random() * population.length)]);
    }

    // Randomly assign seat position for fairness
    const seat = Math.floor(Math.random() * 3);
    const agents: AIWeights[] = [];
    let oppIdx = 0;
    for (let i = 0; i < 3; i++) {
      if (i === seat) {
        agents.push(individual);
      } else {
        agents.push(opponents[oppIdx++]);
      }
    }

    const points = playGame(agents);
    totalPoints += points[seat];
  }

  return totalPoints;
}

/**
 * Play a game where player 0 uses weights and opponents play randomly (50/50 take/pass).
 * Returns placement points for all 3 players.
 */
function playGameVsTrueRandom(agent: AIWeights): number[] {
  let state = createGame(3);
  let turns = 0;

  while (!isGameOver(state) && turns < 1000) {
    const playerIdx = state.currentPlayerIndex;
    let action: Action;

    if (playerIdx === 0) {
      action = decide(state, playerIdx, agent);
    } else {
      // True random: 50/50 take/pass (take if no chips)
      const valid = getValidActions(state);
      if (valid.length === 1) {
        action = valid[0];
      } else {
        action = Math.random() < 0.5 ? 'take' : 'pass';
      }
    }

    state = applyAction(state, action);
    turns++;
  }

  const scores = state.players.map((p) => ({
    id: p.id,
    score: calculateScore(p),
  }));
  scores.sort((a, b) => a.score - b.score);

  const points = [0, 0, 0];
  points[scores[0].id] = 3;
  points[scores[1].id] = 1;
  return points;
}

/**
 * Validate an individual against truly random opponents.
 */
function validateAgainstRandom(individual: AIWeights, numGames: number): number {
  let wins = 0;
  for (let i = 0; i < numGames; i++) {
    const points = playGameVsTrueRandom(individual);
    if (points[0] === 3) wins++;
  }
  return wins / numGames;
}

function train(): AIWeights {
  // Initialize population
  let population: AIWeights[] = [];
  for (let i = 0; i < POPULATION_SIZE; i++) {
    population.push(createRandomIndividual());
  }

  const survivorCount = Math.floor(POPULATION_SIZE * SURVIVAL_RATE);

  // Track best by external validation (vs random agents), not in-population fitness
  let bestValidated: AIWeights = population[0];
  let bestValidatedWinRate = 0;

  for (let gen = 0; gen < NUM_GENERATIONS; gen++) {
    // Evaluate fitness for all individuals (in-population, for selection)
    const fitness = population.map((ind) => evaluateFitness(ind, population));

    // Sort by fitness descending
    const indexed = fitness.map((f, i) => ({ fitness: f, index: i }));
    indexed.sort((a, b) => b.fitness - a.fitness);

    const bestFitness = indexed[0].fitness;
    const avgFitness =
      fitness.reduce((a, b) => a + b, 0) / fitness.length;

    // Every 50 generations, validate top 5 against random agents
    if (gen % 50 === 0 || gen === NUM_GENERATIONS - 1) {
      const topN = Math.min(5, indexed.length);
      for (let t = 0; t < topN; t++) {
        const candidate = population[indexed[t].index];
        const winRate = validateAgainstRandom(candidate, 200);
        if (winRate > bestValidatedWinRate) {
          bestValidatedWinRate = winRate;
          bestValidated = { weights: [...candidate.weights], threshold: candidate.threshold };
        }
      }
      console.log(
        `Gen ${gen.toString().padStart(3)}: best=${bestFitness.toString().padStart(3)} avg=${avgFitness.toFixed(1).padStart(6)} | validated best: ${(bestValidatedWinRate * 100).toFixed(1)}% vs random`
      );
    } else if (gen % 10 === 0) {
      console.log(
        `Gen ${gen.toString().padStart(3)}: best=${bestFitness.toString().padStart(3)} avg=${avgFitness.toFixed(1).padStart(6)}`
      );
    }

    // Selection: top survivors
    const survivors = indexed
      .slice(0, survivorCount)
      .map((x) => population[x.index]);

    // Reproduction: fill remaining slots
    const nextGen: AIWeights[] = [...survivors];
    while (nextGen.length < POPULATION_SIZE) {
      const parentA = survivors[Math.floor(Math.random() * survivors.length)];
      const parentB = survivors[Math.floor(Math.random() * survivors.length)];
      const child = mutate(crossover(parentA, parentB));
      nextGen.push(child);
    }

    population = nextGen;
  }

  return bestValidated;
}

// Run training
console.log('Starting evolutionary training...');
console.log(
  `Population: ${POPULATION_SIZE}, Games/eval: ${GAMES_PER_EVAL}, Generations: ${NUM_GENERATIONS}`
);
console.log('---');

const startTime = Date.now();
const bestWeights = train();
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('---');
console.log(`Training complete in ${elapsed}s`);
console.log(`Best weights: [${bestWeights.weights.map((w) => w.toFixed(4)).join(', ')}]`);
console.log(`Threshold: ${bestWeights.threshold.toFixed(4)}`);

// Save to weights.json
const outputPath = path.join(process.cwd(), 'weights.json');
fs.writeFileSync(outputPath, JSON.stringify(bestWeights, null, 2));
console.log(`Saved to ${outputPath}`);

// Validation: play 1000 games against truly random agents (50/50)
console.log('\nValidation: trained AI vs truly random agents (1000 games)...');
let wins = 0;
const valGames = 1000;
for (let i = 0; i < valGames; i++) {
  const points = playGameVsTrueRandom(bestWeights);
  if (points[0] === 3) wins++;
}
console.log(
  `Win rate vs random: ${((wins / valGames) * 100).toFixed(1)}% (${wins}/${valGames}) — target: >80%`
);

// Also test against random-weight agents
console.log('Validation: trained AI vs random-weight agents (1000 games)...');
let wins2 = 0;
for (let i = 0; i < valGames; i++) {
  const randomA = createRandomIndividual();
  const randomB = createRandomIndividual();
  const points = playGame([bestWeights, randomA, randomB]);
  if (points[0] === 3) wins2++;
}
console.log(
  `Win rate vs random-weight: ${((wins2 / valGames) * 100).toFixed(1)}% (${wins2}/${valGames})`
);
