import { execSync } from 'child_process';

export interface ValidationResult {
  passed: boolean;
  report: string;
}

/**
 * Safe, predefined shell executor limiting bash validation scripts.
 */
export class ValidationService {
  /**
   * Sandbox Validation mapping explicitly to Vitest and target standard format.
   */
  static runSandboxValidation(): ValidationResult {
    console.log(`[Validation Sandbox] Triggering automated testing suite...`);
    try {
      // Execute the test run strictly looking for CI-readable output formatting
      const output = execSync('npx vitest run --reporter=json', { encoding: 'utf-8', stdio: 'pipe' });
      return { passed: true, report: 'Testing heuristics passed.' };
    } catch (error: any) {
      // Vitest json failure outputs hit stderr/stdout on non-zero exit hooks
      return { passed: false, report: error.stdout || error.message };
    }
  }

  /**
   * Full block TSC validation. Restricted to run ONLY after entire block completion natively.
   */
  static runTscCheck(): ValidationResult {
    console.log(`[Validation Sandbox] Firing Full Block TSC Verification...`);
    try {
      const output = execSync('npx tsc --noEmit', { encoding: 'utf-8', stdio: 'pipe' });
      return { passed: true, report: 'TypeScript AST constraints satisfied across block.' };
    } catch (error: any) {
      return { passed: false, report: error.stdout || error.message };
    }
  }
}
