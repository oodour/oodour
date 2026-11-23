import { execFileSync, spawnSync } from 'node:child_process';

export interface Churn {
  readonly commits: ReadonlyMap<string, number>;
  readonly shallow: boolean;
}

export function churn(folder: string, since: string): Churn | undefined {
  if (spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: folder }).status !== 0) {
    return undefined;
  }

  const git = (args: readonly string[]): string =>
    execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd: folder, encoding: 'utf8', maxBuffer: 1024 ** 3 });
  const log = git(['log', `--since=${since}`, '--format=%H', '--name-status', '-M']);

  return { commits: commitsPerCurrentPath(log), shallow: git(['rev-parse', '--is-shallow-repository']).trim() === 'true' };
}

export function commitsPerCurrentPath(newestFirstLog: string): Map<string, number> {
  const commits = new Map<string, number>();
  const laterPath = new Map<string, string>();

  for (const line of newestFirstLog.split('\n')) {
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
