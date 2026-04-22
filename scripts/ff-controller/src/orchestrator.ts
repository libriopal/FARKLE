import fs from 'fs';
import path from 'path';
import { LockService } from './services/lock.service.js';
import { AiService } from './services/ai.service.js';
import { ValidationService } from './services/validation.service.js';
import { RepairEngine } from './repair-engine.js';
import { GitService } from './services/git.service.js';

/**
 * Top level controller managing phase integration and ensuring constraint mappings.
 */
export class Orchestrator {
  private aiService = new AiService();
  private repairEngine = new RepairEngine(this.aiService);

  async run(promptId: string, instruction: string): Promise<void> {
    const tempDir = path.resolve('.ff-verify/temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const lockedFiles: string[] = [];

    try {
      // PHASE 1: GENERATION AND STAGING
      const generatedFiles = await this.aiService.generateInitialPatch(instruction);
      
      if (generatedFiles.length === 0) {
        throw new Error(`Pipeline Terminated: Phase 1 Generation rendered blank data arrays.`);
      }

      console.log(`[Controller Ops] Interfacing with ${generatedFiles.length} nodes...`);
      
      let sandboxPass = true;
      let terminalReport = '';
      let executionHistory: string[] = [];

      for (const file of generatedFiles) {
         const targetPath = path.resolve(file.filename);
         const tempFilePath = path.join(tempDir, path.basename(file.filename));

         // Write active file constraints via PID mapping Lock
         const lockTargetDir = path.dirname(targetPath);
         if (!fs.existsSync(lockTargetDir)) fs.mkdirSync(lockTargetDir, { recursive: true });
         
         const lock = LockService.acquireLock(targetPath);
         lockedFiles.push(lock);

         fs.writeFileSync(tempFilePath, file.content, 'utf-8');

         // Temporarily map the temp file into the real source to allow workspace dependencies
         // like TS paths and aliased imports inside Vitest to resolve accurately.
         const realSrcBackupBytes = fs.existsSync(targetPath) ? fs.readFileSync(targetPath) : null;
         fs.writeFileSync(targetPath, file.content, 'utf-8');

         // PHASE 1 VALIDATION
         let valResult = ValidationService.runSandboxValidation();
         
         // PHASE 2 SELF HEALING PROTOCOLS
         if (!valResult.passed) {
           console.log(`\n[Controller Ops] Target node '${file.filename}' rejected Baseline Rules. Invoking Repair Engine...`);
           
           // Pass the targetPath allowing TS Morph to link accurately inside the loop context scope.
           const repairResult = await this.repairEngine.runRepairLoop(targetPath, valResult.report);
           
           if (!repairResult.passed) {
             sandboxPass = false;
             terminalReport = repairResult.finalError;
             executionHistory = repairResult.attemptLog;
             // Write fallback backup before extracting constraint
             if(realSrcBackupBytes) fs.writeFileSync(targetPath, realSrcBackupBytes);
             break;
           }
         }

         // File passes - permanently leave the verified modification bounded in the root
      }

      // PHASE 3: PRODUCTION HARDENING TS BLOCK
      if (sandboxPass) {
         console.log(`\n[Controller Ops] Initiating End Block Full Compiler Constraints...`);
         
         // "The tsc compiler check MUST ONLY run at the very end of a full block completion."
         const tscResult = ValidationService.runTscCheck();
         
         if (!tscResult.passed) {
             console.error(`\n[CRITICAL] TS Block Check Failed! Escalating Output Data.`);
             GitService.createEscalationReport(
               promptId, 
               "Multiple files committed, refer to branch diff.", 
               tscResult.report, 
               ["Pipeline succeeded isolated tests but failed universal tsc link."]
             );
             return;
         }
         
         console.log(`\n✅ System Generation & Repair Pipeline Validated Correctly.`);
         GitService.pushBranch(promptId);
         GitService.createPullRequest(promptId);
         
      } else {
         const escalationStateDump = fs.readFileSync(path.join(tempDir, path.basename(generatedFiles[0].filename)), 'utf-8');
         GitService.createEscalationReport(promptId, escalationStateDump, terminalReport, executionHistory);
      }

    } catch (error: any) {
      console.error(`\n🚨 Critical Failure within the Pipeline Construct:`, error);
    } finally {
      console.log(`\n[Controller Ops] Flushing Concurrency Locks...`);
      for (const lock of lockedFiles) {
        LockService.releaseLock(lock);
      }
      if (fs.existsSync(tempDir)) {
         fs.rmSync(tempDir, { recursive: true, force: true });
      }
      console.log(`Pipeline Process Exited.`);
    }
  }
}
