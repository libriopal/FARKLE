#!/usr/bin/env node
import { Orchestrator } from './orchestrator.js';

/**
 * Entry point for the ff-controller self-healing system.
 * 
 * Usage:
 * npx tsx src/cli.ts <PROMPT_ID> --auto "[patch instruction]"
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: ff-controller <PROMPT_ID> --auto "[prompt]"');
    process.exit(1);
  }

  const promptId = args[0];
  const autoFlagIndex = args.indexOf('--auto');

  if (autoFlagIndex === -1) {
    console.error('Missing required --auto flag for self-healing mode.');
    process.exit(1);
  }

  // Extract everything after --auto as the instruction block
  const promptInstruction = args.slice(autoFlagIndex + 1).join(' ');

  console.log(`\n🚀 Initializing ff-controller Pipeline...`);
  console.log(`ID: ${promptId}`);
  
  const orchestrator = new Orchestrator();
  await orchestrator.run(promptId, promptInstruction);
}

main().catch((err) => {
    console.error('Fatal Pipeline Execution Error:', err);
    process.exit(1);
});
