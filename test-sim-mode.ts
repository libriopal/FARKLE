import { simulateMode } from './src/utils/monteCarlo';

const res = simulateMode('SOLO_FREE', { strategy: 'random', sessions: 4000 });
console.log(res);
