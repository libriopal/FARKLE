/**
 * @file src/utils/RTPEngine.ts
 * @description Casino payout normalizer and drift correction engine.
 */

import { buildScoreTable } from './chainIndex';
import { simulateMode } from './monteCarlo';
import type { GameMode } from '../types/game';

/**
 * Engine for calibrating real-money payouts to a target Return-to-Player (RTP)
 * percentage using Monte Carlo simulation. Tracks live session RTP.
 */
export class RTPEngine {
  public targetRTP: number;
  public normalizer: number | null;

  private totalBets: number;
  private totalPayouts: number;

  /**
   * Initializes the RTP Engine.
   * @param targetRTP The target Return-to-Player percentage (default: 0.82).
   */
  constructor(targetRTP = 0.82) {
    this.targetRTP = targetRTP;
    this.normalizer = null;
    this.totalBets = 0;
    this.totalPayouts = 0;
  }

  /**
   * Calibrates the payout normalizer for a given game mode using
   * Monte Carlo simulation via simulateMode().
   * Spawn weights are always uniform — RTP is determined by
   * player decisions, not weight manipulation (Deuces Wild model).
   * @param mode          Game mode to calibrate for.
   * @param blockerDensity Blocker density 0.0-1.0 (default 0.12).
   * @param bankAfterN    Chains before simulated player banks (default 4).
   * @param simCount      Number of sessions to simulate (default 4000).
   * @returns             The computed normalizer value.
   * @example
   * const engine = new RTPEngine(0.92);
   * const normalizer = engine.calibrate('SOLO_FREE', 0.12, 4, 4000);
   */
  public calibrate(
    mode: GameMode,
    blockerDensity = 0.12,
    bankAfterN = 4,
    simCount = 4000
  ): number {
    const table = buildScoreTable();
    const result = simulateMode(mode, table, {
      sessions: simCount,
      strategy: 'average',
      blockerDensity,
      bankAfterChains: bankAfterN,
    });
    this.normalizer = Math.round(result.avgScore / this.targetRTP);
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
   * @param bet The bet amount placed.
   * @param payout The payout amount awarded.
   * @example
   * engine.recordSession(10, 8.50);
   */
  public recordSession(bet: number, payout: number): void {
    this.totalBets += bet;
    this.totalPayouts += payout;
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
}
