import { simulateSession } from './src/utils/monteCarlo';
import { seededRng } from './src/utils/csprng';

const rng = seededRng(0xFA2C1E42);
const options = {
  sessions: 1,
  bankAfterChains: 4,
  blockerDensity: 0.12,
  playerCount: 1,
  strategy: 'random' as const,
  optimalBankStep: 4,
};

const score = simulateSession(rng, options);
console.log("Score:", score);
