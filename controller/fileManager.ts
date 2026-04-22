import fs from 'fs';
import path from 'path';

export class FileManager {
  static initDirectories() {
    const dirs = [
      '.ff-verify/temp',
      '.ff-verify/reports',
      '.ff-verify/history',
      '.ff-verify/locks'
    ];
    dirs.forEach(dir => fs.mkdirSync(path.resolve(dir), { recursive: true }));
  }

  static acquireLock(id: string): string {
    const lockPath = path.resolve(`.ff-verify/locks/${id}.lock`);
    if (fs.existsSync(lockPath)) {
      throw new Error(`Lock System: Execution locked for ${id}. Aborting.`);
    }
    fs.writeFileSync(lockPath, process.pid.toString(), 'utf-8');
    return lockPath;
  }

  static releaseLock(id: string) {
    const lockPath = path.resolve(`.ff-verify/locks/${id}.lock`);
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  }

  static writeTempPrompt(id: string, text: string): string {
    const p = path.resolve(`.ff-verify/temp/${id}.prompt.txt`);
    fs.writeFileSync(p, text, 'utf-8');
    return p;
  }

  static writeTempCode(id: string, content: string): string {
    const p = path.resolve(`.ff-verify/temp/${id}.ts`);
    fs.writeFileSync(p, content, 'utf-8');
    return p;
  }

  static atomicFinalWrite(tempPath: string, targetPath: string, id: string) {
    const backupPath = path.resolve(`.ff-verify/history/${id}_final_backup.ts`);
    const resolvedTarget = path.resolve(targetPath);
    
    if (fs.existsSync(resolvedTarget)) {
      fs.copyFileSync(resolvedTarget, backupPath);
    }
    
    const tmpReplace = `${resolvedTarget}.tmp`;
    fs.copyFileSync(tempPath, tmpReplace);
    fs.renameSync(tmpReplace, resolvedTarget);
  }
}
