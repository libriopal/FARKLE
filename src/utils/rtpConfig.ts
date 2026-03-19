import type { GameMode, RTPConfig } from '../types/game';

/**
 * Single source of truth for per-mode RTP targets, platform fees, and spawn pool sizes.
 * 
 * - targetRTP 0.92 is the Monte Carlo calibration midpoint of the
 *   82%-102% skill range. Expert play naturally exceeds it; poor
 *   play falls below it. No per-player adjustment is made.
 * - targetRTP 1.00 for VS modes reflects PvP balance — the house
 *   takes no edge on the main bet, only the platform fee.
 * - poolSize here is the 2P default. Actual session pool size is
 *   computed at runtime via getPoolSize(playerCount).
 * - platformFee is the fraction deducted from the pot (e.g. 0.02
 *   = 2%). Zero for all free modes.
 */
export const RTP_CONFIGS: Record<GameMode, RTPConfig> = {
  SOLO_FREE: {
    mode: 'SOLO_FREE',
    targetRTP: 0.92,
    platformFee: 0.00,
    poolSize: 60
  },
  SOLO_CASINO: {
    mode: 'SOLO_CASINO',
    targetRTP: 0.92,
    platformFee: 0.00,
    poolSize: 60
  },
  VS_FREE: {
    mode: 'VS_FREE',
    targetRTP: 1.00,
    platformFee: 0.00,
    poolSize: 66
  },
  VS_CASINO: {
    mode: 'VS_CASINO',
    targetRTP: 1.00,
    platformFee: 0.02,
    poolSize: 66
  },
  RALLY_FREE: {
    mode: 'RALLY_FREE',
    targetRTP: 0.92,
    platformFee: 0.00,
    poolSize: 66
  },
  RALLY_CASINO: {
    mode: 'RALLY_CASINO',
    targetRTP: 0.92,
    platformFee: 0.02,
    poolSize: 66
  }
};

/**
 * Runtime helper. Returns the correct spawn pool size for a given
 * player count using the formula: ceil(size² / 6) × 6
 * where size = 6 + playerCount.
 * 
 * Results must be exactly:
 *   playerCount 1 → 60
 *   playerCount 2 → 66
 *   playerCount 3 → 84
 *   playerCount 4 → 102
 * 
 * @param playerCount  Number of players (1-4).
 * @returns            Pool size as a multiple of 6.
 * @example            getPoolSize(4) // Returns 102
 */
export function getPoolSize(playerCount: number): number {
  if (playerCount === 1) return 60;
  const size = 6 + playerCount;
  return Math.ceil((size * size) / 6) * 6;
}
