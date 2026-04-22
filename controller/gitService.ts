import { safeSpawn } from './validator';

export class GitService {
  static verifyClean(force: boolean) {
    const status = safeSpawn('git', ['status', '--porcelain']);
    if (status.stdout.trim().length > 0 && !force) {
      throw new Error('Git safety constraints failed: Tree is dirty. Aborting. Option: Use --force.');
    }
  }

  static commitSuccess(id: string) {
    const branch = `patch/${id}`;
    safeSpawn('git', ['checkout', '-b', branch]);
    safeSpawn('git', ['add', '.']);
    safeSpawn('git', ['commit', '-m', `fix: validated patch ${id}`]);
    safeSpawn('git', ['push', '-u', 'origin', branch]);
  }

  static escalateBranch(id: string) {
    const branch = `patch/${id}_escalation`;
    safeSpawn('git', ['checkout', '-b', branch]);
    safeSpawn('git', ['add', '.']);
    safeSpawn('git', ['commit', '-m', `chore: escalated failures for patch ${id}`]);
    safeSpawn('git', ['push', '-u', 'origin', branch]);
  }
}
