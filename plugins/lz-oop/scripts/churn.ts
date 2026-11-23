import type { Git } from './git.ts';

export type HistoryLimit = 'shallow' | 'partial';

export type Uncountable = 'treeless';

export interface Churn {
  readonly commits: ReadonlyMap<string, number>;
  readonly limits: readonly HistoryLimit[];
}

export function churn(git: Git, since: string): Churn | Uncountable {
  const config = git(['config', '--list']);

  // A treeless clone would have to fetch the older commits' file lists before it could name the files they changed.
  if (/^remote\..+\.partialclonefilter=(?:combine:(?:[^+\n]*\+)*)?tree:/m.test(config)) {
    return 'treeless';
  }

  // Finding a rename compares file contents, and a partial clone would fetch the old ones from its remote.
  const partial = promisorIn(config) || /^extensions\.partialclone=./m.test(config);
  // Finding a rename reads the attributes of the files it compares, from the work tree unless attr.tree names a tree,
  // and a link in the work tree can lead to a share. The empty tree holds none; with no input, hash-object names it in
  // the repository's own hash. Git before 2.45 has no attr.tree and still reads the work tree.
  const emptyTree = git(['hash-object', '-t', 'tree', '--stdin']).trim();
  const log = git([
    '-c',
    `attr.tree=${emptyTree}`,
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
    limits: [...(shallow ? ['shallow' as const] : []), ...(partial ? ['partial' as const] : [])],
  };
}

// Git before 2.54 lists a value as written, whatever --type says, so a remote is a promisor by any spelling Git reads as
// true: a key with no value, true, yes, on, or a number other than 0 (with a k, m or g after it).
const promisorIn = (config: string): boolean =>
  config
    .split('\n')
    .map((line) => /^remote\..+\.promisor(?:=(.*))?$/i.exec(line))
    .some((entry) => {
      const value = entry?.[1];

      return entry !== null && (value === undefined || /^(?:true|yes|on|[-+]?0*[1-9]\d*[kmg]?)$/i.test(value));
    });

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
