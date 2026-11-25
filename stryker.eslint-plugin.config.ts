// Mutation testing for eslint-plugin.
//
// With LZ_NODE_TEST_RUNNER set to the runner's source entry in an lz-node-test checkout at a pinned commit, Stryker runs
// lz-node-test's node:test runner, which runs per mutant only the test files whose tests reach it, and adds that
// checkout's Node.js mutators and numeric-literal mutator to Stryker's own:
//   LZ_NODE_TEST_RUNNER=<checkout>/packages/stryker-node-test-runner/src/index.ts \
//     node --conditions=@oodour/source node_modules/@stryker-mutator/core/bin/stryker.js run \
//     stryker.eslint-plugin.config.ts
// Unset, it falls back to Stryker's command runner, which runs the whole suite for every mutant.
// While iterating, add --incremental; finish with one run without it, as an incremental run copies older results into
// the report and misses changes to test utilities, fixtures and config.
import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { nodeTestRunnerOptions, sharedOptions } from './stryker.shared.ts';

const { LZ_NODE_TEST_RUNNER: nodeTestRunner } = process.env;
const testFiles = 'packages/eslint-plugin/src/**/*.test.ts';

const runnerOptions: PartialStrykerOptions =
  nodeTestRunner === undefined
    ? { testRunner: 'command', commandRunner: { command: `node --test "${testFiles}"` }, timeoutMS: 30000 }
    : {
        ...(await nodeTestRunnerOptions(nodeTestRunner)),
        lzNodeTest: { testFiles: [testFiles] },
        // Test files that start typescript-eslint's project service start slowly, and slower still beside the checker.
        timeoutFactor: 3,
        timeoutMS: 60000,
      };

const config: PartialStrykerOptions = {
  ...sharedOptions,
  ...runnerOptions,
  tsconfigFile: 'packages/eslint-plugin/tsconfig.json',
  htmlReporter: { fileName: 'reports/mutation/eslint-plugin.html' },
  mutate: ['packages/eslint-plugin/src/**/*.ts', '!packages/eslint-plugin/src/**/*.test.ts'],
  incrementalFile: 'reports/stryker-incremental/eslint-plugin.json',
};

export default config;
