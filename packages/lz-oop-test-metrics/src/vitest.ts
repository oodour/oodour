import { readFileSync } from 'node:fs';
import { posix, relative, sep } from 'node:path';
import type { Reporter } from 'vitest/node';
import { reportLine, reportsAtLimit } from './crap.ts';
import { functionsIn } from './functions.ts';
import { measuredFromIstanbul, parseCoverageMap } from './istanbul.ts';

export interface TestMetricsOptions {
  /** The CRAP score at which a function is reported; Fallow's default. */
  readonly limit?: number;
}

/**
 * A Vitest reporter that scores each covered function by CRAP, from the run's coverage and the cyclomatic count of
 * ESLint's `complexity` rule, prints a line for each function at the limit, and fails the run when there is one.
 */
export class TestMetricsReporter implements Reporter {
  readonly #limit: number;

  constructor({ limit = 30 }: TestMetricsOptions = {}) {
    this.#limit = limit;
  }

  onCoverage(coverage: unknown): void {
    const measured = [...parseCoverageMap(coverage)].flatMap(([path, file]) =>
      measuredFromIstanbul(shownPath(path), functionsIn(path, readFileSync(path, 'utf8')), file),
    );
    const lines = reportsAtLimit(measured, this.#limit).map((report) => reportLine(report, this.#limit));

    if (lines.length > 0) {
      console.log(lines.join('\n'));
      process.exitCode = 1;
    }
  }
}

/** The path from the working directory, with `/` between its parts on every platform so a line reads the same. */
function shownPath(path: string): string {
  return relative(process.cwd(), path).split(sep).join(posix.sep);
}
