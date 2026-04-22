import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class Logger {
  private logData: any[] = [];
  
  logAction(id: string, attempt: number, action: string, result: boolean, reason: string) {
    this.logData.push({ attempt, action, result, reason, timestamp: new Date().toISOString() });
    const logPath = path.resolve(`.ff-verify/reports/${id}_log.json`);
    fs.writeFileSync(logPath, JSON.stringify(this.logData, null, 2), 'utf-8');
  }

  static escalate(id: string, code: string, report: string, attempts: string[]) {
    const targetPath = path.resolve(`.ff-verify/reports/${id}_escalation.txt`);
    const content = `
ESCALATION: ${id}
---
HISTORY:
${attempts.join('\n')}
---
REPORT:
${report}
---
FINAL CODE:
${code}`;
    fs.writeFileSync(targetPath, content.trim(), 'utf-8');
  }

  static hashState(code: string): string {
    // Loop Stability Normalization Fix
    let lines = code.replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd());
    lines = lines.filter((line, i, arr) => !(line.trim() === '' && arr[i-1]?.trim() === ''));
    
    // Sort imports basically
    const imports = lines.filter(l => l.startsWith('import ')).sort();
    const rest = lines.filter(l => !l.startsWith('import '));
    const normalized = [...imports, ...rest].join('\n').trim();
    
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}
