import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { churn } from './churn.ts';
import { type FunctionComplexity, functionComplexity } from './complexity.ts';
import { isTest, sources } from './files.ts';
import { dependentsThroughReexports, readModules } from './modules.ts';

export interface FileMeasures {
  readonly file: string;
  readonly commits: number | undefined;
  readonly dependents: { readonly production: number; readonly test: number };
  readonly largest: FunctionComplexity | undefined;
  readonly exportsConcreteClass: boolean;
  readonly concreteClassesNamed: readonly string[];
}

export type Quadrant = 'changed and complex' | 'depended on' | 'complex, unchanged' | 'simple';

const auditFirstQuadrants: readonly Quadrant[] = ['changed and complex', 'depended on'];

export interface Thresholds {
  readonly commits: number;
  readonly complexity: number;
  readonly dependents: number;
}

export interface Ranked {
  readonly thresholds: Thresholds;
  readonly rows: readonly (FileMeasures & { readonly quadrant: Quadrant })[];
}

export interface Measured {
  readonly files: readonly FileMeasures[];
  readonly history: 'full' | 'shallow' | 'none';
  readonly reexportsOnly: readonly string[];
  readonly parseErrors: readonly string[];
}

export function measureScope(scope: string, since: string): Measured {
  const { root, all, inScope } = sources(scope);
  const history = churn(scope, since);
  const modules = readModules(root, all);
  const dependents = dependentsThroughReexports(modules);
  const reexportsOnly = inScope.filter((file) => modules.get(file)?.reexportsOnly === true);
  const parseErrors: string[] = [];
  const files = inScope
    .filter((file) => !isTest(file) && !reexportsOnly.includes(file))
    .flatMap((file): FileMeasures[] => {
      const facts = modules.get(file);
      let functions;

      try {
        functions = functionComplexity(file, readFileSync(join(root, file), 'utf8'));
      } catch (error) {
        parseErrors.push(error instanceof Error ? error.message : String(error));

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
          exportsConcreteClass: (facts?.concreteClasses.length ?? 0) > 0,
          concreteClassesNamed: facts?.concreteClassesNamed ?? [],
        },
      ];
    });

  return {
    files,
    history: history === undefined ? 'none' : history.shallow ? 'shallow' : 'full',
    reexportsOnly,
    parseErrors,
  };
}

export function renderHotspots(scope: string, since: string, measured: Measured, ranked: Ranked): string {
  const { commits, complexity, dependents } = ranked.thresholds;
  const listed = (items: readonly string[], none: string): string => (items.length > 0 ? items.join(', ') : none);
  const rows = ranked.rows.map((row) =>
    [
      row.file,
      row.commits ?? '-',
      `${String(row.dependents.production)}, ${String(row.dependents.test)}`,
      row.largest ? `${row.largest.name}, line ${String(row.largest.line)}: ${String(row.largest.complexity)}` : 'none',
      row.exportsConcreteClass ? 'yes' : 'no',
      listed(row.concreteClassesNamed, 'none'),
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
    ...(measured.parseErrors.length > 0 ? [`Left out, not parsed: ${listed(measured.parseErrors, '')}.`] : []),
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

    if (measured.dependents.production >= thresholds.dependents && (often || measured.exportsConcreteClass)) {
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

function upperQuartile(values: readonly number[]): number {
  return values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.75) - 1] ?? 0;
}
