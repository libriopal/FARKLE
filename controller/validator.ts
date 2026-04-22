import { spawnSync } from 'child_process';

export interface SpawnResult {
  passed: boolean;
  stdout: string;
  stderr: string;
}

export function safeSpawn(command: string, args: string[]): SpawnResult {
  const result = spawnSync(command, args, { shell: false, encoding: 'utf-8' });
  return {
    passed: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}
