import { execFileSync, spawnSync } from 'node:child_process';

export type Git = (args: readonly string[]) => string;

// Windows looks for a program in the working folder before PATH, so git starts in this folder and goes to the
// audited one with -C. The settings stop the audited repository's own config from starting programs or fetching.
const safely = (folder: string, args: readonly string[]): readonly string[] => [
  '-C',
  folder,
  '-c',
  'core.quotePath=false',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'log.showSignature=false',
  ...args,
];

export function gitIn(folder: string): Git | undefined {
  // Git translates its messages, and only the English one tells "no repository" from a repository it refuses.
  const probe = spawnSync('git', safely(folder, ['rev-parse', '--is-inside-work-tree']), {
    cwd: import.meta.dirname,
    encoding: 'utf8',
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1', LANGUAGE: 'C', LC_ALL: 'C' },
  });

  if (probe.error) {
    if ('code' in probe.error && probe.error.code === 'ENOENT') {
      return undefined;
    }

    throw probe.error;
  }

  if (probe.status !== 0) {
    if (probe.stderr.includes('not a git repository')) {
      return undefined;
    }

    throw new Error(`git: ${probe.stderr.trim()}`);
  }

  return (args) =>
    execFileSync('git', safely(folder, args), {
      cwd: import.meta.dirname,
      encoding: 'utf8',
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1' },
      maxBuffer: 1024 ** 3,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
}
