import { execFileSync, spawnSync } from 'node:child_process';

export type Git = (args: readonly string[]) => string;

export function gitIn(folder: string): Git | undefined {
  // Git translates its messages, and only the English one tells "no repository" from a repository it refuses.
  const probe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: folder,
    encoding: 'utf8',
    env: { ...process.env, LANGUAGE: 'C', LC_ALL: 'C' },
  });

  if (probe.error) {
    throw probe.error;
  }

  if (probe.status !== 0) {
    if (probe.stderr.includes('not a git repository')) {
      return undefined;
    }

    throw new Error(`git: ${probe.stderr.trim()}`);
  }

  return (args) =>
    execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd: folder, encoding: 'utf8', maxBuffer: 1024 ** 3 });
}
