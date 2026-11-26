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
// The ESLint package tests the core too, through its rules, so its tests run here as well. Each test process loads
// stryker.sandbox-core.ts first, which points its `@oodour/core` imports at the sandbox's mutated copy instead of the
// real one the workspace links into node_modules. The test-metrics suite stays out: its tests that run node:test on
// fixtures report lines one off under this run.
import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { nodeTestRunnerOptions, sharedOptions, sourceCondition } from './stryker.shared.ts';

const { LZ_NODE_TEST_RUNNER: nodeTestRunner } = process.env;
const testFiles = ['packages/core/src/**/*.test.ts', 'packages/eslint-plugin/src/**/*.test.ts'];
const nodeArgs = [sourceCondition, '--import=./stryker.sandbox-core.ts'];

const runnerOptions: PartialStrykerOptions =
  nodeTestRunner === undefined
    ? {
        testRunner: 'command',
        commandRunner: { command: `node ${nodeArgs.join(' ')} --test ${testFiles.map((files) => `"${files}"`).join(' ')}` },
        timeoutMS: 60000,
      }
    : {
        ...(await nodeTestRunnerOptions(nodeTestRunner)),
        lzNodeTest: { testFiles, nodeArgs },
        // The ESLint package's test files that start typescript-eslint's project service start slowly.
        timeoutFactor: 3,
        timeoutMS: 60000,
      };

const config: PartialStrykerOptions = {
  ...sharedOptions,
  ...runnerOptions,
  tsconfigFile: 'packages/core/tsconfig.json',
  htmlReporter: { fileName: 'reports/mutation/core.html' },
  mutate: ['packages/core/src/**/*.ts', '!packages/core/src/**/*.test.ts'],
  incrementalFile: 'reports/stryker-incremental/core.json',
};

export default config;
