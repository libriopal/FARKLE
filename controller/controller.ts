import { safeSpawn } from './validator';
import { Orchestrator } from './orchestrator';
import { FileManager } from './fileManager';
import fs from 'fs';
import path from 'path';

function preflight() {
  const [major] = process.version.replace('v', '').split('.');
  if (parseInt(major, 10) < 20) {
    console.error('Environment Error: Node version must be >= 20');
    process.exit(1);
  }

  const deps = [
    { cmd: 'npx', args: ['tsc', '--version'] },
    { cmd: 'npx', args: ['vitest', '--version'] },
    { cmd: 'git', args: ['--version'] },
    { cmd: 'gh', args: ['--version'] }
  ];

  for (const dep of deps) {
    const res = safeSpawn(dep.cmd, dep.args);
    if (!res.passed) {
      console.error(`Environment Error: Missing dependency -> ${dep.cmd} ${dep.args[0]}`);
      process.exit(1);
    }
  }
}

async function main() {
  preflight();
  FileManager.initDirectories();

  const args = process.argv.slice(2);
  const promptId = args[0];
  const autoFlagIdx = args.indexOf('--auto');
  const forceFlag = args.includes('--force');

  if (!promptId || autoFlagIdx === -1) {
    console.error('Usage: controller <PROMPT_ID> --auto "[PATCH PROMPT]" [--force]');
    process.exit(1);
  }

  const promptText = args.slice(autoFlagIdx + 1).filter(a => a !== '--force').join(' ');

  const configPath = path.resolve('controller/ff-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Configuration Error: controller/ff-config.json missing.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const targetFile = config[promptId];

  if (!targetFile) {
    console.error(`Configuration Error: Target mapping missing for ${promptId}.`);
    process.exit(1);
  }

  const orchestrator = new Orchestrator();
  await orchestrator.run({
    promptId,
    targetFile,
    promptText,
    force: forceFlag
  });
}

main().catch(err => {
  console.error('Fatal execution error:', err.message);
  process.exit(1);
});
