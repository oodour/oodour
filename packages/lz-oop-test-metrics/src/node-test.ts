import { readFileSync } from 'node:fs';
import type { TestEvent } from 'node:test/reporters';
import { reportLine, reportsAtLimit } from './crap.ts';
import { functionsIn } from './functions.ts';
import { measuredFromNodeCoverage } from './node-coverage.ts';
import { shownPath } from './shown-path.ts';

export interface TestMetricsOptions {
  /** The CRAP score at which a function is reported; Fallow's default. */
  readonly limit?: number;
}

/**
 * A `node:test` reporter that scores each covered function by CRAP, from the run's coverage and the cyclomatic count
 * of ESLint's `complexity` rule, writes a line for each function at the limit, and fails the run when there is one.
 * A reporter module takes no options, so a limit other than the default needs a module that exports this call's result.
 */
export function createTestMetricsReporter({ limit = 30 }: TestMetricsOptions = {}) {
  return async function* testMetrics(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
    for await (const event of source) {
      if (event.type === 'test:coverage') {
        const measured = event.data.summary.files.flatMap((file) =>
          measuredFromNodeCoverage(shownPath(file.path), functionsIn(file.path, readFileSync(file.path, 'utf8')), file),
        );
        const reports = reportsAtLimit(measured, limit);

        for (const report of reports) {
          yield `${reportLine(report, limit)}\n`;
        }

        if (reports.length > 0) {
          process.exitCode = 1;
        }
      }
    }
  };
}

export default createTestMetricsReporter();
