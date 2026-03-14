/**
 * @file src/utils/RTPEngine.ts
 * @description Casino payout normalizer and drift correction engine.
 */

import { scoreFarkle } from './farkleScorer';
import { seededRng } from './csprng';
import type { DieFace } from '../types/game';
import { MULTIPLIER_LADDER } from '../types/game';

/**
 * Clamps a number between a minimum and maximum value.
 */
const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

/**
 * Engine for calibrating real-money payouts to a target Return-to-Player (RTP)
 * percentage using Monte Carlo simulation. Tracks live session RTP and nudges
 * die-face weights to correct drift.
 */
export class RTPEngine {
  public targetRTP: number;
  public normalizer: number | null;
  public weights: [number, number, number, number, number, number];

  private totalBets: number;
  private totalPayouts: number;

  /**
   * Initializes the RTP Engine.
   * @param targetRTP The target Return-to-Player percentage (default: 0.82).
   */
  constructor(targetRTP = 0.82) {
    this.targetRTP = targetRTP;
    this.normalizer = null;
    this.weights = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
    this.totalBets = 0;
    this.totalPayouts = 0;
  }

  /**
   * Calibrates the normalizer by running Monte Carlo simulations.
   * @param blockerDensity The density of blockers on the board (default: 0.12).
   * @param bankAfterN The number of consecutive chains before the simulated player banks (default: 4).
   * @param simCount The number of simulation sessions to run (default: 4000).
   * @returns The computed normalizer value.
   * @example
   * const normalizer = engine.calibrate(0.15, 3, 5000);
   */
  public calibrate(blockerDensity = 0.12, bankAfterN = 4, simCount = 4000): number {
    const rng = seededRng(0xc0ffee42);
    let totalScore = 0;

    for (let i = 0; i < simCount; i++) {
      totalScore += this.simSession(blockerDensity, bankAfterN, rng);
    }

    const averageScore = totalScore / simCount;
    this.normalizer = Math.round(averageScore / this.targetRTP);
    return this.normalizer;
  }

  /**
   * Manually sets the normalizer value.
   * Useful for testing or syncing the normalizer from the server.
   * @param n The normalizer value to set.
   * @example
   * engine.setNormalizer(15000);
   */
  public setNormalizer(n: number): void {
    this.normalizer = n;
  }

  /**
   * Calculates the payout for a given score and bet amount.
   * @param score The final banked score of the session.
   * @param bet The bet amount placed by the player.
   * @returns The calculated payout amount.
   * @throws Error if calibrate() has not been called and normalizer is null.
   * @example
   * const payout = engine.scoreToPayout(25000, 10);
   */
  public scoreToPayout(score: number, bet: number): number {
    if (this.normalizer === null) {
      throw new Error('Call calibrate() first');
    }
    return (score / this.normalizer) * bet;
  }

  /**
   * Records a completed session's bet and payout to track live RTP.
   * Automatically nudges die-face weights to correct any drift.
   * @param bet The bet amount placed.
   * @param payout The payout amount awarded.
   * @example
   * engine.recordSession(10, 8.50);
   */
  public recordSession(bet: number, payout: number): void {
    this.totalBets += bet;
    this.totalPayouts += payout;
    this.nudge();
  }

  /**
   * Gets the current live session RTP based on recorded bets and payouts.
   * @returns The live RTP, or the target RTP if no bets have been recorded.
   * @example
   * const currentRTP = engine.sessionRTP;
   */
  public get sessionRTP(): number {
    if (this.totalBets > 0) {
      return this.totalPayouts / this.totalBets;
    }
    return this.targetRTP;
  }

  /**
   * Adjusts die-face weights to correct RTP drift.
   * Nudges the weights of scoring faces (1 and 5) based on the difference
   * between live session RTP and target RTP.
   */
  private nudge(): void {
    const drift = this.sessionRTP - this.targetRTP;
    
    const w1 = clamp(1 / 6 - drift * 1.6, 0.07, 0.30);
    const w5 = clamp(1 / 6 - drift * 0.8, 0.07, 0.30);
    const wo = (1 - w1 - w5) / 4;
    
    this.weights = [w1, wo, wo, wo, w5, wo];
  }

  /**
   * Simulates a single player session to estimate the average score.
   * @param blockerDensity The density of blockers on the board.
   * @param bankAfterN The number of consecutive chains before banking.
   * @param rng The synchronous pseudo-random number generator function.
   * @returns The total score achieved in the simulated session.
   */
  private simSession(blockerDensity: number, bankAfterN: number, rng: () => number): number {
    const w1 = this.weights[0];
    const w5 = this.weights[4];
    const baseFP = clamp(0.13 - (w1 + w5) * 0.38 + blockerDensity * 0.21, 0.03, 1.0);
    
    let banked = 0;
    let unbanked = 0;
    let chains = 0;

    for (let turnIndex = 0; turnIndex < 25; turnIndex++) {
      const fp = Math.min(0.60, baseFP + turnIndex * 0.011);
      
      // Simulate a Farkle event based on Farkle Probability (fp)
      if (rng() < fp) {
        unbanked = 0;
        chains = 0;
        if (rng() < 0.33) {
          break; // Player quits after a frustrating Farkle
        }
        continue;
      }

      // Roll a chain
      const len = 1 + Math.floor(rng() * 6); // Chain length 1-6
      const dice: DieFace[] = [];
      
      for (let i = 0; i < len; i++) {
        const float = rng();
        let cumulative = 0;
        let face: DieFace = 6;
        
        for (let j = 0; j < 6; j++) {
          cumulative += this.weights[j];
          if (float < cumulative) {
            face = (j + 1) as DieFace;
            break;
          }
        }
        dice.push(face);
      }

      const { score } = scoreFarkle(dice);

      if (score === 0) {
        // Treat as Farkle
        unbanked = 0;
        chains = 0;
        if (rng() < 0.33) {
          break;
        }
        continue;
      }

      // Successful chain
      const multIndex = Math.min(chains, MULTIPLIER_LADDER.length - 1);
      const mult = MULTIPLIER_LADDER[multIndex];
      
      unbanked += score * mult;
      chains++;

      if (chains >= bankAfterN) {
        banked += unbanked;
        unbanked = 0;
        chains = 0;
        
        if (rng() > 0.42) {
          break; // Player banks and leaves satisfied
        }
      }
    }

    return banked + unbanked;
  }
}
