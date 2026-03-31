import { simulateSession } from './src/utils/monteCarlo';
import { seededRng } from './src/utils/csprng';

const rng = seededRng(0xFA2C1E42);
const options = {
  sessions: 4000,
  bankAfterChains: 4,
  blockerDensity: 0.12,
  playerCount: 1,
  strategy: 'perfect' as const,
  optimalBankStep: 4,
};

let total = 0;
for (let i = 0; i < 4000; i++) {
  total += simulateSession(rng, options);
}
console.log("Average Score:", total / 4000);
