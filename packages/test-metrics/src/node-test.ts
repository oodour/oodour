import { readFileSync } from 'node:fs';
import type { TestEvent } from 'node:test/reporters';
import { functionsIn } from './functions.ts';
import { measuredFromNodeCoverage } from './node-coverage.ts';
import { testMetricsReport, type TestMetricsOptions } from './report.ts';
import { shownPath } from './shown-path.ts';

/**
 * A `node:test` reporter that measures each covered function from the run's coverage and the cyclomatic count of
 * ESLint's `complexity` rule, writes a stop-and-look line for each signal it finds, and fails the run when a function's
 * CRAP score reaches the limit. A reporter module takes no options, so other options need a module that exports this
 * call's result.
 */
export function createTestMetricsReporter(options: TestMetricsOptions = {}) {
  return async function* testMetrics(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
    for await (const event of source) {
      if (event.type === 'test:coverage') {
        const measured = event.data.summary.files.flatMap((file) =>
          measuredFromNodeCoverage(shownPath(file.path), functionsIn(file.path, readFileSync(file.path, 'utf8')), file),
        );
        const { lines, failed } = testMetricsReport(measured, options);

        for (const line of lines) {
          yield `${line}\n`;
        }

        if (failed) {
          process.exitCode = 1;
        }
      }
    }
  };
}

export default createTestMetricsReporter();
