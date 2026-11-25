// Mutation testing for lz-oop-core.
//
// With LZ_NODE_TEST_RUNNER set to the runner's source entry in an lz-node-test checkout at a pinned commit, Stryker runs
// lz-node-test's node:test runner, which runs per mutant only the test files whose tests reach it, and adds that
// checkout's Node.js mutators and numeric-literal mutator to Stryker's own:
//   LZ_NODE_TEST_RUNNER=<checkout>/packages/stryker-node-test-runner/src/index.ts \
//     node --conditions=@layzee/source node_modules/@stryker-mutator/core/bin/stryker.js run \
//     stryker.lz-oop-core.config.ts
// Unset, it falls back to Stryker's command runner, which runs the whole suite for every mutant.
import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { nodeTestRunnerOptions, sharedOptions } from './stryker.shared.ts';

const { LZ_NODE_TEST_RUNNER: nodeTestRunner } = process.env;
const testFiles = 'packages/lz-oop-core/src/**/*.test.ts';

const runnerOptions: PartialStrykerOptions =
  nodeTestRunner === undefined
    ? { testRunner: 'command', commandRunner: { command: `node --test "${testFiles}"` }, timeoutMS: 60000 }
    : { ...(await nodeTestRunnerOptions(nodeTestRunner)), lzNodeTest: { testFiles: [testFiles] }, timeoutMS: 60000 };

const config: PartialStrykerOptions = {
  ...sharedOptions,
  ...runnerOptions,
  tsconfigFile: 'packages/lz-oop-core/tsconfig.json',
  htmlReporter: { fileName: 'reports/mutation/lz-oop-core.html' },
  mutate: ['packages/lz-oop-core/src/**/*.ts', '!packages/lz-oop-core/src/**/*.test.ts'],
  incrementalFile: 'reports/stryker-incremental/lz-oop-core.json',
};

export default config;
