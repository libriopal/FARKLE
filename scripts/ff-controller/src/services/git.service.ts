import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Encapsulates Git & GitHub CLI integrations for PR Generation and Failure Escalations.
 */
export class GitService {
  static branchName(promptId: string): string {
    return `patch/${promptId}`;
  }

  /**
   * Securely branches and commits the active workspace to local and remote.
   */
  static pushBranch(promptId: string): void {
    const branch = this.branchName(promptId);
    console.log(`[Git Integration] Creating and pushing branch: ${branch}`);
    
    try {
        execSync(`git checkout -b ${branch}`, { stdio: 'ignore' });
        execSync(`git add .`, { stdio: 'ignore' });
    } catch {
        console.error('[Git Integration] Failed setting up branch state.');
        return;
    }

    try {
      execSync(`git commit -m "Auto-Patch Validation: ${promptId}"`, { stdio: 'ignore' });
    } catch (e) {
      console.log(`[Git Integration] No changes tracked to commit.`);
    }

    try {
      execSync(`git push -u origin ${branch}`, { stdio: 'ignore' });
    } catch (e) {
      console.error(`[Git Integration] Failed to push. Validate remote 'origin' configuration.`);
    }
  }

  /**
   * Invokes standard gh pr create command.
   */
  static createPullRequest(promptId: string): void {
    console.log(`[Git Integration] Generating Pull Request for ${promptId}...`);
    try {
      execSync(`gh pr create --fill`, { stdio: 'inherit' });
      console.log(`[Git Integration] Pipeline Success. PR Opened.`);
    } catch (e) {
      console.error(`[Git Integration] GitHub CLI failed to create PR. Ensure 'gh' is authenticated.`);
    }
  }

  /**
   * Escalates a critically broken patch payload for human review without opening a PR.
   */
  static createEscalationReport(promptId: string, finalState: string, failureReport: string, history: string[]): void {
    console.log(`[Escalation Protocol] Generating structured escalation report.`);
    
    const reportPath = `.ff-verify/reports/${promptId}_escalation.txt`;
    const dir = reportPath.substring(0, reportPath.lastIndexOf('/'));
    
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const content = `
ESCALATION REPORT: ${promptId}
==========================================
STATUS: Pipeline terminated after Max Attempts or identical loop traps.
RECOMMENDATION: Manual Developer Intervention Required.

### REPAIR ATTEMPT HISTORY:
${history.map(item => `- ${item}`).join('\n')}

### TERMINATING VALIDATION OUTPUT:
==========================================
${failureReport}
==========================================

### SECURED CODE STATE AT TERMINATION:
==========================================
${finalState}
    `.trim();

    fs.writeFileSync(reportPath, content, 'utf-8');

    // Push the branch immediately so history is tracked securely in origin, bypassing PR constraint.
    this.pushBranch(promptId);
    
    console.log(`[Escalation Protocol] Branch pushed. Report dumped securely to ${reportPath}.`);
  }
}
