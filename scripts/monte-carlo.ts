/**
 * @file scripts/monte-carlo.ts
 * @description Standalone Node.js CLI for RTP simulations.
 */

import { buildScoreTable } from '../src/utils/chainIndex';
import { simulateMode, simulateSession } from '../src/utils/monteCarlo';
import { RTP_CONFIGS, getPoolSize } from '../src/utils/rtpConfig';
import { seededRng } from '../src/utils/csprng';
import type { GameMode } from '../src/types/game';
import type { SimStrategy, SimOptions } from '../src/utils/monteCarlo';
import * as fs from 'fs';
import * as path from 'path';

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
} as const;

const args = process.argv.slice(2);
let isVerbose = false;
let exportTxt = false;
let exportDocx = false;
const positionalArgs: string[] = [];

for (const arg of args) {
  if (arg === '-v') isVerbose = true;
  else if (arg === '-t') exportTxt = true;
  else if (arg === '-d') exportDocx = true;
  else positionalArgs.push(arg);
}

const modeStr = positionalArgs[0] || 'SOLO_FREE';
const sessions = positionalArgs[1] ? parseInt(positionalArgs[1], 10) : 4000;

const validModes = ['SOLO_FREE', 'SOLO_CASINO', 'VS_FREE', 'VS_CASINO', 'RALLY_FREE', 'RALLY_CASINO'];
if (!validModes.includes(modeStr)) {
  console.error(`${C.red}${C.bold}Error:${C.reset} Invalid mode "${modeStr}"`);
  console.error(`${C.dim}Valid modes: SOLO_FREE, SOLO_CASINO, VS_FREE, VS_CASINO, RALLY_FREE, RALLY_CASINO${C.reset}`);
  process.exit(1);
}

const mode = modeStr as GameMode;
const table = buildScoreTable();

console.log(`╔═══════════════════════════════════════════════════════╗`);
console.log(`║  🎲 FARKLE FRENZY — RTP SIMULATION                   ║`);
console.log(`╚═══════════════════════════════════════════════════════╝`);
console.log(`Mode: ${C.cyan}${mode}${C.reset} | Sessions: ${C.yellow}${sessions}${C.reset} | Strategy: all three\n`);

const strategies: SimStrategy[] = ['average', 'random', 'perfect'];
const results: Record<SimStrategy, { avgScore: number; stdDev: number; trueRTP: number }> = {} as any;

let debugContent = `Timestamp: ${new Date().toISOString()}\nMode: ${mode}\nSessions: ${sessions}\n\n`;

for (const strategy of strategies) {
  console.log(`${C.bold}${C.cyan}--- Strategy: ${strategy} ---${C.reset}`);
  debugContent += `--- Strategy: ${strategy} ---\n`;
  
  if (isVerbose) {
    const rng = seededRng(0xFA2C1E42);
    const options: Required<SimOptions> = {
      sessions,
      bankAfterChains: 4,
      blockerDensity: 0.12,
      playerCount: 1,
      strategy,
      optimalBankStep: 4,
    };
    
    const scores: number[] = [];
    const padLen = sessions.toString().length;
    
    for (let i = 0; i < sessions; i++) {
      const score = simulateSession(rng, options);
      scores.push(score);
      
      let color = C.dim;
      if (score >= 5000) color = C.green;
      else if (score >= 2000) color = C.cyan;
      else if (score >= 500) color = C.yellow;
      else if (score === 0) color = C.red;
      
      const blocks = '█'.repeat(Math.min(20, Math.floor(score / 300)));
      const paddedIdx = (i + 1).toString().padStart(padLen, '0');
      const scoreStr = score === 0 ? '0 pts (Farkle)' : `${score.toLocaleString()} pts`;
      const barStr = score === 0 ? '·' : blocks;
      
      const line = `  [${paddedIdx}] ${barStr.padEnd(20, ' ')} ${scoreStr}`;
      console.log(`${color}${line}${C.reset}`);
      debugContent += `${line}\n`;
    }
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / sessions;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / sessions;
    const stdDev = Math.sqrt(variance);
    
    results[strategy] = {
      avgScore: Math.round(avgScore),
      stdDev: Math.round(stdDev),
      trueRTP: 0
    };
  } else {
    const res = simulateMode(mode, { strategy, sessions });
    results[strategy] = {
      avgScore: res.avgScore,
      stdDev: res.stdDev,
      trueRTP: 0
    };
  }
  
  console.log(`Completed ${strategy} strategy.\n`);
  debugContent += `Completed ${strategy} strategy.\n\n`;
}

const avgScoreAverage = results['average'].avgScore;
const normalizer = avgScoreAverage / RTP_CONFIGS[mode].targetRTP;

for (const strategy of strategies) {
  results[strategy].trueRTP = normalizer > 0 ? results[strategy].avgScore / normalizer : 0;
}

console.log(`═══════════════════════════════════════════════════`);
console.log(`Strategy    AvgScore    StdDev    RTP`);
console.log(`───────────────────────────────────────────────────`);

debugContent += `═══════════════════════════════════════════════════\n`;
debugContent += `Strategy    AvgScore    StdDev    RTP\n`;
debugContent += `───────────────────────────────────────────────────\n`;

const displayOrder: SimStrategy[] = ['random', 'average', 'perfect'];

for (const strategy of displayOrder) {
  const r = results[strategy];
  const stratStr = strategy.padEnd(12, ' ');
  const avgStr = r.avgScore.toString().padEnd(12, ' ');
  const stdStr = r.stdDev.toString().padEnd(10, ' ');
  const rtpStr = r.trueRTP.toFixed(2);
  
  let rtpColor = C.red;
  if (r.trueRTP >= 1.00) rtpColor = C.green;
  else if (r.trueRTP >= 0.90) rtpColor = C.yellow;
  
  console.log(`${stratStr}${avgStr}${stdStr}${rtpColor}${rtpStr}${C.reset}`);
  debugContent += `${stratStr}${avgStr}${stdStr}${rtpStr}\n`;
}

console.log(`═══════════════════════════════════════════════════`);
console.log(`Normalizer (average): ${Math.round(normalizer)}`);
console.log(`═══════════════════════════════════════════════════\n`);

debugContent += `═══════════════════════════════════════════════════\n`;
debugContent += `Normalizer (average): ${Math.round(normalizer)}\n`;
debugContent += `═══════════════════════════════════════════════════\n`;

if (exportTxt || exportDocx) {
  const debugDir = path.join(process.cwd(), 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (exportTxt) {
    const txtPath = path.join(debugDir, `rtp-${mode}-${timestamp}.txt`);
    fs.writeFileSync(txtPath, debugContent, 'utf-8');
    console.log(`${C.green}✓ Debug text saved:${C.reset} debug/rtp-${mode}-${timestamp}.txt`);
  }
  
  if (exportDocx) {
    const docxPath = path.join(debugDir, `rtp-${mode}-${timestamp}.docx`);
    const docxContent = `# Note: open in any text editor if Word is unavailable\n\n${debugContent}`;
    fs.writeFileSync(docxPath, docxContent, 'utf-8');
    console.log(`${C.green}✓ Debug docx saved:${C.reset} debug/rtp-${mode}-${timestamp}.docx`);
  }
}
