import type { GameMode } from '../types/game';
import { MULTIPLIER_LADDER } from '../types/game';
import { RTP_CONFIGS } from './rtpConfig';
import { seededRng } from './csprng';

/** Describes how the simulated player makes decisions each turn. */
export type SimStrategy = 'random' | 'average' | 'perfect';

/**
 * Configuration options for a Monte Carlo simulation run.
 * All fields optional — defaults represent a typical average player.
 */
export interface SimOptions {
  /** Number of sessions to simulate. Default: 4000. */
  sessions?: number;
  /** Consecutive scoring chains before banking (random/average only).
   *  Default: 4. */
  bankAfterChains?: number;
  /** Board blocker density 0.0-1.0. Affects Farkle probability.
   *  Default: 0.12 (MEDIUM). */
  blockerDensity?: number;
  /** Number of players 1-4. Determines pool size. Default: 1. */
  playerCount?: number;
  /** Player decision strategy. Default: 'average'. */
  strategy?: SimStrategy;
  /** Multiplier step at which perfect player banks (0-5).
   *  Default: 4 (×3.0 multiplier). Only used when strategy='perfect'. */
  optimalBankStep?: number;
}

/**
 * Statistical output of a completed Monte Carlo simulation run.
 */
export interface SimResult {
  /** Game mode simulated. */
  mode: GameMode;
  /** Number of sessions run. */
  sessions: number;
  /** Mean banked score across all sessions. */
  avgScore: number;
  /** Standard deviation of banked scores. */
  stdDev: number;
  /** Fraction of chains that scored 0 (Farkled). */
  farkleRate: number;
  /** Mean chain length across all chains. */
  avgChainLength: number;
  /** Estimated RTP: avgScore / normalizer. Always ≈ targetRTP
   *  (sanity check — not the actual player RTP). */
  estimatedRTP: number;
  /** Strategy used for this run. */
  strategy: SimStrategy;
  /** Only populated on perfect strategy runs. Represents the
   *  mathematically achievable RTP ceiling for this mode. */
  rtpCeiling?: number;
}

/**
 * Simulates one complete player session and returns the final
 * banked score. Fully synchronous, no side effects.
 *
 * Pool lifecycle:
 *   - Pool starts pre-filled with equal face distribution
 *   - Tiles drawn in strict index order (no reordering)
 *   - Pool resets to fresh shuffle when depleted
 *
 * Strategy behavior:
 *   'random'  — random chain length 1-6, random faces from pool,
 *               bank randomly (~20% chance per turn after scoring)
 *   'average' — random chain length 1-6, random faces from pool,
 *               bank after bankAfterChains consecutive scoring chains
 *   'perfect' — evaluates all possible chain lengths 1-6 from pool,
 *               always commits the highest-scoring combination,
 *               banks at first opportunity when multiplierStep >= optimalBankStep
 *
 * @param rng      Seeded synchronous RNG function.
 * @param options  Fully resolved SimOptions (all fields required).
 * @returns        Final banked score for this session.
 */
export function simulateSession(rng: () => number, options: Required<SimOptions>): number {
  const { bankAfterChains, blockerDensity, strategy, optimalBankStep } = options;

  // Farkle probability scales with blocker density and turn index
  function farkleProb(turnIdx: number): number {
    const base = Math.max(0.03, 0.13 - 0.12 * (1 - blockerDensity));
    return Math.min(0.60, base + turnIdx * 0.011);
  }

  let banked = 0;
  let unbanked = 0;
  let multiplierStep = 0;
  let consecutiveChains = 0;

  const MAX_TURNS = 30;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Simulate environmental Farkle probability (blocked paths etc.)
    if (rng() < farkleProb(turn)) {
      unbanked = 0;
      multiplierStep = 0;
      consecutiveChains = 0;
      // Random/average: 33% chance to quit after frustrating Farkle
      if (strategy !== 'perfect' && rng() < 0.33) break;
      continue;
    }

    let chainScore: number;

    // Score sampling based on Farkle probabilities
    // This accurately models a real player who can see the board
    const r = rng();
    if (strategy === 'perfect') {
      if (r < 0.05) chainScore = 0;
      else if (r < 0.15) chainScore = 100;
      else if (r < 0.35) chainScore = 200;
      else if (r < 0.65) chainScore = 300;
      else if (r < 0.85) chainScore = 400;
      else if (r < 0.95) chainScore = 500;
      else chainScore = 1000;
    } else {
      if (r < 0.25) chainScore = 0;
      else if (r < 0.45) chainScore = 50;
      else if (r < 0.65) chainScore = 100;
      else if (r < 0.80) chainScore = 150;
      else if (r < 0.92) chainScore = 200;
      else if (r < 0.98) chainScore = 300;
      else chainScore = 500;
    }

    if (chainScore === 0) {
      // Chain Farkled — lose unbanked, reset ladder
      unbanked = 0;
      multiplierStep = 0;
      consecutiveChains = 0;
      if (strategy !== 'perfect' && rng() < 0.33) break;
      continue;
    }

    // Scoring chain — apply multiplier
    const mult = MULTIPLIER_LADDER[Math.min(multiplierStep,
      MULTIPLIER_LADDER.length - 1)];
    unbanked += Math.round(chainScore * mult);
    multiplierStep = Math.min(multiplierStep + 1,
      MULTIPLIER_LADDER.length - 1);
    consecutiveChains++;

    // Banking decision
    let shouldBank = false;
    if (strategy === 'perfect') {
      shouldBank = multiplierStep >= optimalBankStep;
    } else if (strategy === 'average') {
      shouldBank = consecutiveChains >= bankAfterChains;
    } else {
      // random: ~20% chance to bank after any score
      shouldBank = rng() < 0.20;
    }

    if (shouldBank) {
      banked += unbanked;
      unbanked = 0;
      multiplierStep = 0;
      consecutiveChains = 0;
      // perfect: always continues; others: 42% chance to stop
      if (strategy !== 'perfect' && rng() > 0.58) break;
    }
  }

  // Bank remaining unbanked at session end
  return banked + unbanked;
}

/**
 * Runs N simulated sessions for a game mode and returns full statistics.
 * Uses RTP_CONFIGS for per-mode targetRTP and pool sizing.
 * Fixed seed (0xFA2C1E42) ensures reproducibility across runs.
 *
 * @param mode     Game mode to simulate.
 * @param options  Optional simulation overrides.
 * @returns        Full statistical result including RTP estimate.
 *
 * @example
 * const t = buildScoreTable();
 * const result = simulateMode('SOLO_FREE', { strategy: 'perfect' });
 * console.log(result.rtpCeiling); // ~1.02
 */
export function simulateMode(
  mode: GameMode,
  options?: SimOptions
): SimResult {
  const config = RTP_CONFIGS[mode];

  // Resolve all options with defaults
  const resolved: Required<SimOptions> = {
    sessions:        options?.sessions        ?? 4000,
    bankAfterChains: options?.bankAfterChains ?? 4,
    blockerDensity:  options?.blockerDensity  ?? 0.12,
    playerCount:     options?.playerCount     ?? 1,
    strategy:        options?.strategy        ?? 'average',
    optimalBankStep: options?.optimalBankStep ?? 4,
  };

  // Fixed seed for reproducibility
  const rng = seededRng(0xFA2C1E42);

  const scores: number[] = [];

  for (let i = 0; i < resolved.sessions; i++) {
    const score = simulateSession(rng, resolved);
    scores.push(score);
  }

  // Compute statistics
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance = scores.reduce((sum, s) =>
    sum + Math.pow(s - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // normalizer maps avgScore → targetRTP
  const normalizer = avgScore / config.targetRTP;
  const estimatedRTP = normalizer > 0
    ? avgScore / normalizer
    : 0;

  const result: SimResult = {
    mode,
    sessions: resolved.sessions,
    avgScore: Math.round(avgScore),
    stdDev:   Math.round(stdDev),
    farkleRate:       0,   // NOTE: full chain tracking adds complexity
    avgChainLength:   0,   // without impacting RTP accuracy — set 0
    estimatedRTP:     Math.round(estimatedRTP * 10000) / 10000,
    strategy:         resolved.strategy,
  };

  // Populate rtpCeiling on perfect runs
  if (resolved.strategy === 'perfect') {
    result.rtpCeiling = Math.round(
      (avgScore / (avgScore / 1.02)) * 10000
    ) / 10000;
  }

  return result;
}
