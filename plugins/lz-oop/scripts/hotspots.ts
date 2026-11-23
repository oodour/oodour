import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { churn } from './churn.ts';
import { type FunctionComplexity, functionComplexity } from './complexity.ts';
import { isTest, sources } from './files.ts';
import { dependentsOf, readModules } from './modules.ts';

/** What the measures say about one production file in scope. */
export interface FileMeasures {
  readonly file: string;
  /** Commits in the period, or nothing without a history to count. */
  readonly commits: number | undefined;
  readonly dependents: { readonly production: number; readonly test: number };
  /** The file's most complex function, or nothing for a file without functions. */
  readonly largest: FunctionComplexity | undefined;
  /** The file exports a class that is not abstract. */
  readonly concrete: boolean;
  readonly namedClasses: readonly string[];
}

export type Quadrant = 'changed and complex' | 'depended on' | 'complex, unchanged' | 'simple';

/** The quadrants whose files are always listed, whatever the limit. */
const auditFirstQuadrants: readonly Quadrant[] = ['changed and complex', 'depended on'];

export interface Thresholds {
  /** The commits at which a file counts as often changed. */
  readonly commits: number;
  /** The largest function complexity at which a file counts as complex. */
  readonly complexity: number;
  /** The production files that import a file for it to count as having many dependents: a tenth, and at least 2. */
  readonly dependents: number;
}

export interface Ranked {
  readonly thresholds: Thresholds;
  readonly rows: readonly (FileMeasures & { readonly quadrant: Quadrant })[];
}

export interface Measured {
  /** The production files in scope, each with its measures, in path order. */
  readonly files: readonly FileMeasures[];
  /** Whether the commits come from a full history, a shallow clone, or no repository at all. */
  readonly history: 'full' | 'shallow' | 'none';
  /** Files left out because they only re-export others. */
  readonly reexportsOnly: readonly string[];
  /** Files left out because the parser could not read them, each with where it stopped. */
  readonly notParsed: readonly string[];
}

/** The measures of every production JavaScript and TypeScript file in `scope`. */
export function measureScope(scope: string, since: string): Measured {
  const { root, all, inScope } = sources(scope);
  const history = churn(scope, since);
  const modules = readModules(root, all);
  const dependents = dependentsOf(modules);
  const reexportsOnly = inScope.filter((file) => modules.get(file)?.reexportsOnly === true);
  const notParsed: string[] = [];
  const files = inScope
    .filter((file) => !isTest(file) && !reexportsOnly.includes(file))
    .flatMap((file): FileMeasures[] => {
      const facts = modules.get(file);
      let functions;

      try {
        functions = functionComplexity(file, readFileSync(join(root, file), 'utf8'));
      } catch (error) {
        notParsed.push(error instanceof Error ? error.message : String(error));

        return [];
      }

      const importers = dependents.get(file) ?? [];

      return [
        {
          file,
          commits: history === undefined ? undefined : (history.commits.get(file) ?? 0),
          dependents: {
            production: importers.filter((importer) => !isTest(importer)).length,
            test: importers.filter(isTest).length,
          },
          largest: functions.reduce<FunctionComplexity | undefined>(
            (most, next) => (most === undefined || next.complexity > most.complexity ? next : most),
            undefined,
          ),
          concrete: (facts?.concreteClasses.length ?? 0) > 0,
          namedClasses: facts?.namedClasses ?? [],
        },
      ];
    });

  return {
    files,
    history: history === undefined ? 'none' : history.shallow ? 'shallow' : 'full',
    reexportsOnly,
    notParsed,
  };
}

/** The report lz-audit leads with: what was measured and how, then one row per file. */
export function renderHotspots(scope: string, since: string, measured: Measured, ranked: Ranked): string {
  const { commits, complexity, dependents } = ranked.thresholds;
  const listed = (items: readonly string[], none: string): string => (items.length > 0 ? items.join(', ') : none);
  const rows = ranked.rows.map((row) =>
    [
      row.file,
      row.commits ?? '-',
      `${String(row.dependents.production)}, ${String(row.dependents.test)}`,
      row.largest ? `${row.largest.name}, line ${String(row.largest.line)}: ${String(row.largest.complexity)}` : 'none',
      row.concrete ? 'yes' : 'no',
      listed(row.namedClasses, 'none'),
      row.quadrant,
    ].join(' | '),
  );

  return [
    `Hot spots in ${scope}: ${String(measured.files.length)} production files, commits since ${since}.`,
    `History: ${historyLines[measured.history]}`,
    `Thresholds: often changed at ${String(commits)} commits or more (the 75th percentile, at least 2); ` +
      `complex at a largest function of ${String(complexity)} or more (the 75th percentile, above 4); ` +
      `many dependents at ${String(dependents)} production files or more (a tenth, at least 2).`,
    ...(measured.reexportsOnly.length > 0 ? [`Left out, only re-exporting: ${listed(measured.reexportsOnly, '')}.`] : []),
    ...(measured.notParsed.length > 0 ? [`Left out, not parsed: ${listed(measured.notParsed, '')}.`] : []),
    '',
    '| File | Commits | Dependents (production, test) | Largest function | Exports a concrete class | Concrete classes it names | Quadrant |',
    '| --- | ---: | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row} |`),
    '',
  ].join('\n');
}

const historyLines: Readonly<Record<Measured['history'], string>> = {
  full: 'the full history of the period.',
  shallow: 'a shallow clone, so the commit counts are too low.',
  none: 'no Git repository, so no commit counts, and no file counts as often changed.',
};

/** Each file's quadrant, the files to audit first leading, up to `limit` rows. */
export function rankHotspots(files: readonly FileMeasures[], limit: number): Ranked {
  const thresholds = {
    commits: Math.max(2, upperQuartile(files.flatMap(({ commits }) => (commits ? [commits] : [])))),
    complexity: Math.max(5, upperQuartile(files.flatMap(({ largest }) => (largest ? [largest.complexity] : [])))),
    dependents: Math.max(2, Math.ceil(files.length / 10)),
  };
  const complexityOf = (measured: FileMeasures): number => measured.largest?.complexity ?? 0;
  const quadrantOf = (measured: FileMeasures): Quadrant => {
    const often = (measured.commits ?? 0) >= thresholds.commits;
    const complex = complexityOf(measured) >= thresholds.complexity;

    if (often && complex) {
      return 'changed and complex';
    }

    if (measured.dependents.production >= thresholds.dependents && (often || measured.concrete)) {
      return 'depended on';
    }

    return complex ? 'complex, unchanged' : 'simple';
  };
  const ranked = files
    .map((measured) => ({ ...measured, quadrant: quadrantOf(measured) }))
    .sort((a, b) => (b.commits ?? 0) - (a.commits ?? 0) || complexityOf(b) - complexityOf(a));
  const auditFirst = auditFirstQuadrants.flatMap((quadrant) => ranked.filter((row) => row.quadrant === quadrant));
  const rest = ranked.filter((row) => !auditFirstQuadrants.includes(row.quadrant));

  return { thresholds, rows: [...auditFirst, ...rest.slice(0, Math.max(0, limit - auditFirst.length))] };
}

/** The 75th percentile by nearest rank, or 0 for no values. */
function upperQuartile(values: readonly number[]): number {
  return values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.75) - 1] ?? 0;
}
