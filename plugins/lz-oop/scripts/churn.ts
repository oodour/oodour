import type { Git } from './git.ts';

export interface Churn {
  readonly commits: ReadonlyMap<string, number>;
  readonly history: 'full' | 'shallow' | 'partial' | 'shallow and partial';
}

export function churn(git: Git, since: string): Churn {
  // Finding a rename compares file contents, and a partial clone would fetch the old ones from its remote.
  const partial = /^(?:remote\..+\.promisor=true|extensions\.partialclone=.+)$/m.test(git(['config', '--list']));
  const log = git([
    'log',
    '--ignore-missing',
    'HEAD',
    `--since=${since}`,
    '--format=%H',
    '--name-status',
    partial ? '--no-renames' : '-M',
    '--',
  ]);

  const shallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';

  return { commits: commitsPerCurrentPath(log), history: historyOf(shallow, partial) };
}

function historyOf(shallow: boolean, partial: boolean): Churn['history'] {
  if (shallow && partial) {
    return 'shallow and partial';
  }

  if (shallow) {
    return 'shallow';
  }

  return partial ? 'partial' : 'full';
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
