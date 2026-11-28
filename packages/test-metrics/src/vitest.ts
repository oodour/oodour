import { readFileSync } from 'node:fs';
import type { Reporter } from 'vitest/node';
import { functionsIn } from './functions.ts';
import { measuredFromIstanbul, parseCoverageMap } from './istanbul.ts';
import { testMetricsReport, type TestMetricsOptions } from './report.ts';
import { shownPath } from './shown-path.ts';

/**
 * A Vitest reporter that measures each covered function from the run's coverage and the cyclomatic count of ESLint's
 * `complexity` rule, prints a stop-and-look line for each signal it finds, and fails the run when a function's CRAP
 * score reaches the limit.
 */
export class TestMetricsReporter implements Reporter {
  readonly #options: TestMetricsOptions;

  constructor(options: TestMetricsOptions = {}) {
    this.#options = options;
  }

  onCoverage(coverage: unknown): void {
    const measured = [...parseCoverageMap(coverage)].flatMap(([path, file]) =>
      measuredFromIstanbul(
        shownPath(path),
        functionsIn(path, readFileSync(path, 'utf8')),
        file,
      ),
    );
    const { lines, failed } = testMetricsReport(measured, this.#options);

    if (lines.length > 0) {
      console.log(lines.join('\n'));
    }

    if (failed) {
      process.exitCode = 1;
    }
  }
}
