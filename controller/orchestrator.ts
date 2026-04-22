import { FileManager } from './fileManager';
import { GitService } from './gitService';
import { AiService } from './aiService';
import { PipelineValidator } from './pipelineValidator';
import { RepairEngine } from './repairEngine';
import path from 'path';
import fs from 'fs';

interface OrchestratorConfig {
  promptId: string;
  targetFile: string;
  promptText: string;
  force: boolean;
}

export class Orchestrator {
  private ai = new AiService();
  private repairEngine = new RepairEngine(this.ai);

  async run(config: OrchestratorConfig) {
    const { promptId, targetFile, promptText, force } = config;
    
    GitService.verifyClean(force);
    const lock = FileManager.acquireLock(promptId);

    try {
      FileManager.writeTempPrompt(promptId, promptText);
      const tempPath = path.resolve(`.ff-verify/temp/${promptId}.ts`);

      const initialCode = await this.ai.generateInitial(promptText);
      FileManager.writeTempCode(promptId, initialCode);

      let terminalFail = null;

      // Pipeline Run #1
      const bash1 = PipelineValidator.runBashIntegration(promptId, tempPath);
      if (bash1) terminalFail = bash1;

      if (!terminalFail) {
        const test1 = PipelineValidator.runIsolatedVitest(targetFile, tempPath);
        if (test1) terminalFail = test1;
      }

      // Invoke Self Healing
      let passedLocal = !terminalFail;
      if (terminalFail) {
        passedLocal = await this.repairEngine.runLoop(promptId, tempPath, targetFile, terminalFail);
      }

      if (!passedLocal) {
         GitService.escalateBranch(promptId);
         return;
      }

      // Atomic overwrite
      FileManager.atomicFinalWrite(tempPath, targetFile, promptId);

      // Final Full Block Execution
      const tscFail = PipelineValidator.runFinalTscBlock();
      if (tscFail) {
         // Rolling back atomic write manually inside history handling is possible,
         // but TSC failing means structural bleed. Reverting real src:
         const backup = path.resolve(`.ff-verify/history/${promptId}_final_backup.ts`);
         if (fs.existsSync(backup)) { fs.copyFileSync(backup, path.resolve(targetFile)); }
         
         const report = `TSC GLOBAL BLOCK BLEED:\n${tscFail}`;
         fs.writeFileSync(path.resolve(`.ff-verify/reports/${promptId}_escalation.txt`), report);
         GitService.escalateBranch(promptId);
         return;
      }

      // Universal Success Write
      GitService.commitSuccess(promptId);

    } finally {
      FileManager.releaseLock(promptId);
    }
  }
}
