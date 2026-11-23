import type { Git } from './git.ts';

export type HistoryLimit = 'shallow' | 'partial' | 'treeless';

export interface Churn {
  readonly commits: ReadonlyMap<string, number>;
  readonly limits: readonly HistoryLimit[];
}

export function churn(git: Git, since: string): Churn {
  const config = git(['config', '--list']);

  // A treeless clone would have to fetch the older commits' file lists before it could name the files they changed.
  if (/^remote\..+\.partialclonefilter=tree:/m.test(config)) {
    return { commits: new Map(), limits: ['treeless'] };
  }

  // Finding a rename compares file contents, and a partial clone would fetch the old ones from its remote.
  const partial =
    /^remote\..+\.promisor=true$/m.test(git(['config', '--list', '--type=bool'])) || /^extensions\.partialclone=./m.test(config);
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

  return {
    commits: commitsPerCurrentPath(log),
    limits: (['shallow', 'partial'] as const).filter((limit) => ({ shallow, partial })[limit]),
  };
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
