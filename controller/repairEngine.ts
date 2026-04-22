import fs from 'fs';
import { Logger } from './logger';
import { AstService, RegexService } from './deterministicRepair';
import { AiService } from './aiService';
import { PipelineValidator } from './pipelineValidator';

export class RepairEngine {
  private logger = new Logger();
  private hashes = new Set<string>();

  constructor(private ai: AiService) {}

  async runLoop(id: string, tempPath: string, targetPath: string, initFail: string): Promise<boolean> {
    let attempt = 1;
    let failingReason = initFail;
    const trackerData: string[] = [];

    while (attempt <= 5) {
      const stateCode = fs.readFileSync(tempPath, 'utf-8');
      const hash = Logger.hashState(stateCode);

      if (this.hashes.has(hash)) {
        trackerData.push(`Attempt ${attempt}: FATAL Loop detected. Output mapped to past cycle.`);
        Logger.escalate(id, stateCode, failingReason, trackerData);
        return false;
      }
      this.hashes.add(hash);

      let repaired = false;

      // Stage 1: AST Fix
      if (AstService.tryFix(tempPath)) {
        this.logger.logAction(id, attempt, 'AST Fix', true, 'Mutated missing structure targets safely.');
        trackerData.push(`Attempt ${attempt}: AST Structure applied.`);
        repaired = true;
      }

      // Stage 2: Regex Fix
      if (!repaired) {
         const { code: newCode, changed } = RegexService.tryFix(stateCode);
         if (changed) {
            fs.writeFileSync(tempPath, newCode, 'utf-8');
            this.logger.logAction(id, attempt, 'REGEX Fix', true, 'Purged format artifacts.');
            trackerData.push(`Attempt ${attempt}: Regex cleanup applied.`);
            repaired = true;
         }
      }

      // Stage 3: AI Minimal Diff
      if (!repaired && attempt < 5) {
         const diff = await this.ai.diffPatch(stateCode, failingReason);
         fs.writeFileSync(tempPath, diff, 'utf-8');
         this.logger.logAction(id, attempt, 'AI Diff Patch', true, 'Analyzed log differential applied.');
         trackerData.push(`Attempt ${attempt}: AI Diff Patch.`);
         repaired = true;
      }

      // Stage 4: AI Full Rewrite Backup
      if (!repaired) {
         const rewrite = await this.ai.fullRewrite(stateCode, failingReason);
         fs.writeFileSync(tempPath, rewrite, 'utf-8');
         this.logger.logAction(id, attempt, 'AI Full Rewrite', true, 'Total structural override applied.');
         trackerData.push(`Attempt ${attempt}: AI Full Rewrite.`);
      }

      // RE-VALIDATE
      const bashErr = PipelineValidator.runBashIntegration(id, tempPath);
      if (bashErr) { failingReason = bashErr; attempt++; continue; }

      const testErr = PipelineValidator.runIsolatedVitest(targetPath, tempPath);
      if (testErr) { failingReason = testErr; attempt++; continue; }

      // Survived local loop bounds
      this.logger.logAction(id, attempt, 'Loop Verification', true, 'Validated successfully.');
      return true;
    }

    // Escalate on break bounds
    Logger.escalate(id, fs.readFileSync(tempPath, 'utf-8'), failingReason, trackerData);
    return false;
  }
}
