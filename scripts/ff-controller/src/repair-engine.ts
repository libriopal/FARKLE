import fs from 'fs';
import crypto from 'crypto';
import { AstService } from './services/ast.service.js';
import { RegexService } from './services/regex.service.js';
import { AiService } from './services/ai.service.js';
import { ValidationService } from './services/validation.service.js';

export class RepairEngine {
  private maxAttempts = 5;
  
  // Implements strict caching to block recursive cyclic fixes mapping same broken logic bounds
  private stateTraces = new Set<string>();
  
  private diagnosticHistory: string[] = [];

  constructor(private aiService: AiService) {}

  /**
   * Evaluates logic failures bounding to Strict Optimization Protocol.
   * Execution Order:
   * 1. AST
   * 2. Regex
   * 3. AI Diff
   * 4. AI Full Rewrite (Last Resort)
   */
  async runRepairLoop(tempFilePath: string, initialError: string): Promise<{ passed: boolean; finalError: string; attemptLog: string[] }> {
    let currentError = initialError;
    let attempt = 0;

    while (attempt < this.maxAttempts) {
      attempt++;
      console.log(`\n==========================================`);
      console.log(`[SELF-HEALING LOOP] Cycle ${attempt} / ${this.maxAttempts}`);
      console.log(`==========================================`);
      
      const fileState = fs.readFileSync(tempFilePath, 'utf-8');
      
      // Calculate file signature mapping
      const stateHash = crypto.createHash('sha256').update(fileState).digest('hex');

      // Loop Trap Safety Constraint
      if (this.stateTraces.has(stateHash)) {
        console.log(`\n[CRITICAL ALARM] Cyclical Mutation Pattern Detected! Breaking execution to avoid token bridging.`);
        this.diagnosticHistory.push(`Attempt ${attempt}: Loop Escaped. Output mapped exactly to a previous cycle.`);
        return { passed: false, finalError: currentError, attemptLog: this.diagnosticHistory };
      }
      this.stateTraces.add(stateHash);

      let repaired = false;

      // STEP 1: AST Structural Mutator
      let astPassed = AstService.tryFix(tempFilePath, currentError);
      if (astPassed) {
         this.diagnosticHistory.push(`Attempt ${attempt}: Integrated AST Target Replacement.`);
         repaired = true;
      }

      // STEP 2: Strict Regex Format Mutator 
      if (!repaired) {
        let regexPassed = RegexService.tryFix(tempFilePath);
        if (regexPassed) {
          this.diagnosticHistory.push(`Attempt ${attempt}: Purged Static Format Artifacts.`);
          repaired = true;
        }
      }

      // STEP 3: API Differential Target Patch (Minimal Token Use)
      if (!repaired && attempt < this.maxAttempts) { 
        const patchedLogic = await this.aiService.generateDiffPatch(fileState, currentError);
        if (patchedLogic !== fileState) {
          fs.writeFileSync(tempFilePath, patchedLogic, 'utf-8');
          this.diagnosticHistory.push(`Attempt ${attempt}: Integrated Diff AI Analysis Patch.`);
          repaired = true;
        }
      }

      // STEP 4: API Override Rewrite (Total Token Burn)
      if (!repaired) {
        const rewrittenLogic = await this.aiService.generateRewrite(fileState, currentError);
        fs.writeFileSync(tempFilePath, rewrittenLogic, 'utf-8');
        this.diagnosticHistory.push(`Attempt ${attempt}: Engaged Total Rewrite Protocol.`);
        repaired = true;
      }

      // Execution Check Constraint 
      const validation = ValidationService.runSandboxValidation();
      if (validation.passed) {
         console.log(`\n[SELF-HEALING LOOP] Successful Mutator Constraints Exited Suite.`);
         return { passed: true, finalError: '', attemptLog: this.diagnosticHistory };
      } else {
         currentError = validation.report;
         console.log(`[SELF-HEALING LOOP] Constraints still breached. Rerouting...`);
      }
    }

    console.log(`\n[SELF-HEALING LOOP] Attempts exhausted. Escalating System State.`);
    return { passed: false, finalError: currentError, attemptLog: this.diagnosticHistory };
  }
}
