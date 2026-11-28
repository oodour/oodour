import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { churn, type HistoryLimit, type Uncountable } from './churn.ts';
import { type FunctionComplexity, functionComplexity } from './complexity.ts';
import { type Ignored, isTest, sources } from './files.ts';
import { gitIn, repositoryTop } from './git.ts';
import { dependentsThroughReexports, readModules } from './modules.ts';

export interface FileMeasures {
  readonly file: string;
  readonly commits: number;
  readonly dependents: { readonly production: number; readonly test: number };
  readonly largest: FunctionComplexity | undefined;
  readonly exportsConcreteClass: boolean;
  readonly concreteClassesNamed: readonly string[];
}

export type Quadrant =
  | 'changed and complex'
  | 'depended on'
  | 'complex, seldom changed'
  | 'simple';

const auditFirstQuadrants: readonly Quadrant[] = [
  'changed and complex',
  'depended on',
];

const policy = {
  percentile: 75,
  leastCommits: 2,
  leastComplexity: 5,
  dependentsShare: 10,
  leastDependents: 2,
} as const;

export interface Thresholds {
  readonly commits: number;
  readonly complexity: number;
  readonly dependents: number;
}

export interface Ranked {
  readonly thresholds: Thresholds;
  readonly rows: readonly (FileMeasures & { readonly quadrant: Quadrant })[];
}

export type Uncounted = Uncountable | 'no repository' | 'untrusted';

export interface Measured {
  readonly files: readonly FileMeasures[];
  readonly history: readonly HistoryLimit[] | Uncounted;
  readonly reexportsOnly: readonly string[];
  readonly parseErrors: readonly string[];
  readonly skipped: readonly string[];
  readonly ignored: Ignored;
}

// A repository not trusted runs no Git: Git starts programs its config names and opens paths its metadata names.
export function measureScope(
  scope: string,
  since: string,
  trusted: boolean,
): Measured {
  const repository = trusted ? gitIn(scope) : undefined;
  const { root, all, inScope, skipped, ignored } = sources(scope, repository);
  const uncounted =
    !trusted && repositoryTop(scope) !== undefined
      ? 'untrusted'
      : 'no repository';
  const counted = repository ? churn(repository.git, since) : uncounted;
  const commitsOf = (file: string): number =>
    typeof counted === 'string' ? 0 : (counted.commits.get(file) ?? 0);
  const modules = readModules(root, all);
  const dependents = dependentsThroughReexports(modules);
  const production = inScope.filter((file) => !isTest(file));
  const reexportsOnly = production.filter(
    (file) => modules.get(file)?.reexportsOnly === true,
  );
  const measured = production
    .filter((file) => modules.get(file)?.reexportsOnly !== true)
    .map((file) => {
      // Stryker disable ArrayDeclaration: every file listed has its facts, so no fallback is taken
      const { concreteClasses, concreteClassesNamed } = modules.get(file) ?? {
        concreteClasses: [],
        concreteClassesNamed: [],
      };
      // Stryker restore ArrayDeclaration
      // Stryker disable next-line ArrayDeclaration: every file listed has its dependents, an empty list at least
      const importers = dependents.get(file) ?? [];
      const complexity = functionComplexity(
        file,
        readFileSync(join(root, file), 'utf8'),
      );

      return 'parseError' in complexity
        ? complexity
        : {
            file,
            commits: commitsOf(file),
            dependents: {
              production: importers.filter((importer) => !isTest(importer))
                .length,
              test: importers.filter(isTest).length,
            },
            largest: complexity.functions.reduce<
              FunctionComplexity | undefined
            >(
              (most, next) =>
                most === undefined || next.complexity > most.complexity
                  ? next
                  : most,
              undefined,
            ),
            exportsConcreteClass: concreteClasses.length > 0,
            concreteClassesNamed,
          };
    });

  return {
    files: measured.flatMap((result) =>
      'parseError' in result ? [] : [result],
    ),
    history: typeof counted === 'string' ? counted : counted.limits,
    reexportsOnly,
    parseErrors: measured.flatMap((result) =>
      'parseError' in result ? [result.parseError] : [],
    ),
    skipped,
    ignored,
  };
}

function ignoredLines({ ignored }: Measured): string[] {
  if (ignored === undefined) {
    return [];
  }

  if (ignored === 'whole scope') {
    return [
      "Left out, ignored: the whole scope, which lies in a folder the repository's ignore files ignore.",
    ];
  }

  const folders =
    ignored.length > 0
      ? `the folder${ignored.length > 1 ? 's' : ''} ${ignored.join(', ')}, and `
      : '';

  return [
    'Left out, ignored by .gitignore files and .git/info/exclude, committed files too (the global excludes file, ' +
      `core.excludesFile, and a linked work tree's exclude file are not read): ${folders}the files they match.`,
  ];
}

const limitClauses: Readonly<Record<HistoryLimit, string>> = {
  shallow: 'a shallow clone, so the commit counts are too low',
  partial:
    "a partial clone, so renames are not followed and a renamed file's older commits count for its old path",
};

const uncountedReasons: Readonly<Record<Uncounted, string>> = {
  'no repository': 'no Git repository, or git is not installed',
  untrusted: 'a repository not trusted with --trusted-repository',
  treeless:
    'a treeless clone, whose older commits name no files without fetching',
};

function historyLine(history: Measured['history']): string {
  if (typeof history === 'string') {
    return `${uncountedReasons[history]}, so no commit counts, and no file counts as often changed.`;
  }

  return history.length === 0
    ? 'the full history of the period.'
    : `${history.map((limit) => limitClauses[limit]).join('; ')}.`;
}

export function renderHotspots(
  scope: string,
  since: string,
  measured: Measured,
  ranked: Ranked,
): string {
  const { commits, complexity, dependents } = ranked.thresholds;
  const listed = (items: readonly string[]): string =>
    items.length > 0 ? items.join(', ') : 'none';
  const rows = ranked.rows.map((row) =>
    [
      row.file,
      typeof measured.history === 'string' ? '-' : row.commits,
      `${String(row.dependents.production)}, ${String(row.dependents.test)}`,
      row.largest
        ? `${row.largest.name}, line ${String(row.largest.line)}: ${String(row.largest.complexity)}`
        : 'none',
      row.exportsConcreteClass ? 'yes' : 'no',
      listed(row.concreteClassesNamed),
      row.quadrant,
    ].join(' | '),
  );
  const percentile = `the ${String(policy.percentile)}th percentile`;

  return [
    `Hot spots in ${scope}: ${String(measured.files.length)} production files, commits since ${since}.`,
    `History: ${historyLine(measured.history)}`,
    `Thresholds: often changed at ${String(commits)} commits or more (${percentile}, at least ${String(policy.leastCommits)}); ` +
      `complex at a largest function of ${String(complexity)} or more (${percentile}, at least ${String(policy.leastComplexity)}); ` +
      `many dependents at ${String(dependents)} production files or more ` +
      `(one in ${String(policy.dependentsShare)}, at least ${String(policy.leastDependents)}).`,
    ...ignoredLines(measured),
    ...(measured.reexportsOnly.length > 0
      ? [`Left out, only re-exporting: ${measured.reexportsOnly.join(', ')}.`]
      : []),
    ...(measured.parseErrors.length > 0
      ? [`Left out, not parsed: ${measured.parseErrors.join('; ')}`]
      : []),
    ...(measured.skipped.length > 0
      ? [
          'Left out, not entered (links, folders it may not list, names ending in a dot or a space, other repositories): ' +
            `${measured.skipped.join(', ')}.`,
        ]
      : []),
    '',
    '| File | Commits | Dependents (production, test) | Largest function | Exports a concrete class | Concrete classes it names | Quadrant |',
    '| --- | ---: | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row} |`),
    '',
  ].join('\n');
}

export function rankHotspots(
  files: readonly FileMeasures[],
  limit: number,
): Ranked {
  const thresholds = {
    commits: Math.max(
      policy.leastCommits,
      percentileOf(
        files.flatMap(({ commits }) => (commits > 0 ? [commits] : [])),
      ),
    ),
    complexity: Math.max(
      policy.leastComplexity,
      percentileOf(
        files.flatMap(({ largest }) => (largest ? [largest.complexity] : [])),
      ),
    ),
    dependents: Math.max(
      policy.leastDependents,
      Math.ceil(files.length / policy.dependentsShare),
    ),
  };
  const complexityOf = (measured: FileMeasures): number =>
    // Stryker disable next-line LzJsNumericLiteral: a function's complexity is 1 at least, so any value below 1 ranks a file with no function after the others
    measured.largest?.complexity ?? 0;
  const quadrantOf = (measured: FileMeasures): Quadrant => {
    const often = measured.commits >= thresholds.commits;
    const complex = complexityOf(measured) >= thresholds.complexity;

    if (often && complex) {
      return 'changed and complex';
    }

    if (
      measured.dependents.production >= thresholds.dependents &&
      (often || measured.exportsConcreteClass)
    ) {
      return 'depended on';
    }

    return complex ? 'complex, seldom changed' : 'simple';
  };
  const ranked = files
    .map((measured) => ({ ...measured, quadrant: quadrantOf(measured) }))
    .sort((a, b) => b.commits - a.commits || complexityOf(b) - complexityOf(a));
  const auditFirst = auditFirstQuadrants.flatMap((quadrant) =>
    ranked.filter((row) => row.quadrant === quadrant),
  );
  const rest = ranked.filter(
    (row) => !auditFirstQuadrants.includes(row.quadrant),
  );

  return {
    thresholds,
    rows: [
      ...auditFirst,
      ...rest.slice(0, Math.max(0, limit - auditFirst.length)),
    ],
  };
}

function percentileOf(values: readonly number[]): number {
  const index = Math.ceil((values.length * policy.percentile) / 100) - 1;

  // Stryker disable next-line LzJsNumericLiteral: no values have no percentile, and each threshold has a least value of 2 or more
  return values.toSorted((a, b) => a - b)[index] ?? 0;
}
