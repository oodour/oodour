// Mutation testing for core.
//
// With LZ_NODE_TEST_RUNNER set to the runner's source entry in an lz-node-test checkout at a pinned commit, Stryker runs
// lz-node-test's node:test runner, which runs per mutant only the test files whose tests reach it, and adds that
// checkout's Node.js mutators and numeric-literal mutator to Stryker's own:
//   LZ_NODE_TEST_RUNNER=<checkout>/packages/stryker-node-test-runner/src/index.ts \
//     node --conditions=@oodour/source --conditions=@layzee/source node_modules/@stryker-mutator/core/bin/stryker.js run \
//     stryker.core.config.ts
// Unset, it falls back to Stryker's command runner, which runs the whole suite for every mutant.
//
// The ESLint package and the test reporters test the core too, through their rules and reports, so their tests run here
// as well. Each test process loads stryker.sandbox-core.ts first, which points its `@oodour/core` imports at the
// sandbox's mutated copy instead of the real one the workspace links into node_modules.
import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { runnerOptions, sandboxCore, sharedOptions } from './stryker.shared.ts';

const config: PartialStrykerOptions = {
  ...sharedOptions,
  ...(await runnerOptions({
    testFiles: [
      'packages/core/src/**/*.test.ts',
      'packages/eslint-plugin/src/**/*.test.ts',
      'packages/test-metrics/src/**/*.test.ts',
    ],
    nodeArgs: [sandboxCore],
    commandTimeoutMS: 60000,
    // The ESLint package's test files that start typescript-eslint's project service start slowly.
    timeoutFactor: 3,
  })),
  tsconfigFile: 'packages/core/tsconfig.json',
  htmlReporter: { fileName: 'reports/mutation/core.html' },
  mutate: ['packages/core/src/**/*.ts', '!packages/core/src/**/*.test.ts'],
  // The default puts `// @ts-nocheck` atop every file in the sandbox, the test reporters' fixtures included, which moves
  // each fixture line their end-to-end tests expect down by one.
  disableTypeChecks: 'packages/core/src/**/*.ts',
  incrementalFile: 'reports/stryker-incremental/core.json',
};

export default config;
