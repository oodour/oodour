// Mutation testing for test-metrics.
//
// With LZ_NODE_TEST_RUNNER set to the runner's source entry in an lz-node-test checkout at a pinned commit, Stryker runs
// lz-node-test's node:test runner, which runs per mutant only the test files whose tests reach it, and adds that
// checkout's Node.js mutators and numeric-literal mutator to Stryker's own:
//   LZ_NODE_TEST_RUNNER=<checkout>/packages/stryker-node-test-runner/src/index.ts \
//     node --conditions=@oodour/source --conditions=@layzee/source node_modules/@stryker-mutator/core/bin/stryker.js run \
//     stryker.test-metrics.config.ts
// Unset, it falls back to Stryker's command runner, which runs the whole suite for every mutant.
// The end-to-end tests run the reporters in child processes, which per-test coverage cannot see, so they reach no
// mutant through lz-node-test's runner; the unit tests carry the score there.
import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { runnerOptions, sharedOptions } from './stryker.shared.ts';

const config: PartialStrykerOptions = {
  ...sharedOptions,
  ...(await runnerOptions({ testFiles: ['packages/test-metrics/src/**/*.test.ts'], commandTimeoutMS: 60000 })),
  tsconfigFile: 'packages/test-metrics/tsconfig.json',
  htmlReporter: { fileName: 'reports/mutation/test-metrics.html' },
  mutate: ['packages/test-metrics/src/**/*.ts', '!packages/test-metrics/src/**/*.test.ts'],
  // The default puts `// @ts-nocheck` atop every file in the sandbox, which moves each fixture line the end-to-end
  // tests expect down by one.
  disableTypeChecks: 'packages/test-metrics/src/**/*.ts',
  // Every mutant is killed or carries a reasoned disable, so a survivor fails the run.
  thresholds: { high: 100, low: 100, break: 100 },
  incrementalFile: 'reports/stryker-incremental/test-metrics.json',
};

export default config;
