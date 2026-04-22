import { safeSpawn } from './validator';
import fs from 'fs';
import path from 'path';

export class PipelineValidator {
  
  static runBashIntegration(id: string, tempPath: string): string | null {
    const script = path.resolve('scripts/example.sh');
    if (fs.existsSync(script)) {
      const res = safeSpawn('bash', [script, id, path.resolve(tempPath)]);
      if (!res.passed) return `Bash Validation Failed:\n${res.stderr}\n${res.stdout}`;
    }
    return null;
  }

  static runIsolatedVitest(targetPath: string, stagedTempPath: string): string | null {
    const realTarget = path.resolve(targetPath);
    const backupData = fs.existsSync(realTarget) ? fs.readFileSync(realTarget) : null;
    let errRes = null;

    try {
      // 🚨 Isolated Target Swapping
      fs.copyFileSync(path.resolve(stagedTempPath), realTarget);
      
      const res = safeSpawn('npx', ['vitest', 'run', '--reporter=json']);
      if (!res.passed) {
        errRes = `Testing Suite Failed:\n${res.stdout || res.stderr}`;
      }
    } finally {
      // 🚨 Immediate Restore Logic 
      if (backupData) {
        fs.writeFileSync(realTarget, backupData);
      } else {
        fs.unlinkSync(realTarget);
      }
    }
    return errRes;
  }

  static runFinalTscBlock(): string | null {
    // Enforces rule: tsc MUST run only after full block completion
    const res = safeSpawn('npx', ['tsc', '--noEmit']);
    if (!res.passed) return `TypeScript Global Block Check Failed:\n${res.stdout}`;
    return null;
  }
}
