import fs from 'fs';
import path from 'path';

/**
 * Service for safely managing concurrency locks.
 * Prevents multiple instances from mutating the same target file.
 */
export class LockService {
  /**
   * Acquires a .lock file adjacent to the target path.
   */
  static acquireLock(filePath: string): string {
    const lockPath = `${filePath}.lock`;
    
    if (fs.existsSync(lockPath)) {
      throw new Error(`Concurrency Constraint Tripped: Lock already exists at ${lockPath}. Is another process running?`);
    }
    
    // Write the current process ID into the lock for traceability
    fs.writeFileSync(lockPath, process.pid.toString(), 'utf-8');
    console.log(`[Lock Engine] Acquired concurrency lock: ${lockPath}`);
    return lockPath;
  }

  /**
   * Unlinks the .lock file.
   */
  static releaseLock(lockPath: string): void {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      console.log(`[Lock Engine] Successfully released lock: ${lockPath}`);
    }
  }
}
