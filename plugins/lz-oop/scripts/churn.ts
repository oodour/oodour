import { execFileSync, spawnSync } from 'node:child_process';

export interface Churn {
  /** Commits per path relative to the repository's top folder. */
  readonly commits: ReadonlyMap<string, number>;
  /** A shallow clone holds only part of the history, so its counts are too low. */
  readonly shallow: boolean;
}

/**
 * The commits since `since` (any date `git log --since` takes) per file of the repository that holds `folder`, or
 * nothing outside a repository.
 */
export function churn(folder: string, since: string): Churn | undefined {
  if (spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: folder }).status !== 0) {
    return undefined;
  }

  const git = (args: readonly string[]): string =>
    execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd: folder, encoding: 'utf8', maxBuffer: 1024 ** 3 });
  const log = git(['log', `--since=${since}`, '--format=%H', '--name-status', '-M']);

  return { commits: commitsPerFile(log), shallow: git(['rev-parse', '--is-shallow-repository']).trim() === 'true' };
}

/**
 * Commits per path in `git log --format=%H --name-status -M` output, newest commit first. A commit before a rename
 * counts for the path the file has after its last rename.
 */
export function commitsPerFile(log: string): Map<string, number> {
  const commits = new Map<string, number>();
  const laterPath = new Map<string, string>();

  for (const line of log.split('\n')) {
    const [, from, to] = line.split('\t');

    if (from !== undefined) {
      const path = laterPath.get(to ?? from) ?? to ?? from;

      commits.set(path, (commits.get(path) ?? 0) + 1);

      if (to !== undefined) {
        laterPath.set(from, path);
      }
    }
  }

  return commits;
}
