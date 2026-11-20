// Mutation testing for eslint-plugin-lz-oop.
//
// With LZ_NODE_TEST_RUNNER set to the runner's source entry in an lz-node-test checkout at a pinned commit, Stryker runs
// lz-node-test's node:test runner, which runs per mutant only the test files whose tests reach it, and adds that
// checkout's Node.js mutators and numeric-literal mutator to Stryker's own:
//   LZ_NODE_TEST_RUNNER=<checkout>/packages/stryker-node-test-runner/src/index.ts \
//     node --conditions=@layzee/source node_modules/@stryker-mutator/core/bin/stryker.js run \
//     stryker.eslint-plugin-lz-oop.config.ts
// Unset, it falls back to Stryker's command runner, which runs the whole suite for every mutant.
// While iterating, add --incremental; finish with one run without it, as an incremental run copies older results into
// the report and misses changes to test utilities, fixtures and config.
import { availableParallelism, freemem } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { PartialStrykerOptions } from '@stryker-mutator/api/core';

const { LZ_NODE_TEST_RUNNER: nodeTestRunner } = process.env;
const testFiles = 'packages/eslint-plugin-lz-oop/src/**/*.test.ts';

// The share of memory and cores one checker or test runner process takes, measured by lz-gardening with this runner
// and the TypeScript checker (0.24 to 0.29 GB), and the 4 GB that stays free for the machine's other sessions.
const gbPerUnit = 0.3;
const reservedGb = 4;
const concurrency = Math.max(
  2,
  Math.min(availableParallelism() - 1, Math.floor((freemem() / 2 ** 30 - reservedGb) / gbPerUnit)),
);

async function nodeTestRunnerOptions(runner: string): Promise<PartialStrykerOptions> {
  const packages = new URL('../../', pathToFileURL(runner));
  const { lzNodeMutators } = await import(new URL('stryker-node-mutators/src/index.ts', packages).href);
  const { lzJsMutators } = await import(new URL('stryker-js-mutators/src/index.ts', packages).href);

  await lzNodeMutators();
  await lzJsMutators({ LzJsNumericLiteral: true });

  return {
    testRunner: 'lz-node-test',
    appendPlugins: [runner],
    lzNodeTest: { testFiles: [testFiles] },
    coverageAnalysis: 'perTest',
    // Test files that start typescript-eslint's project service start slowly, and slower still beside the checker.
    timeoutFactor: 3,
    timeoutMS: 60000,
  };
}

const runnerOptions: PartialStrykerOptions =
  nodeTestRunner === undefined
    ? { testRunner: 'command', commandRunner: { command: `node --test "${testFiles}"` }, timeoutMS: 30000 }
    : await nodeTestRunnerOptions(nodeTestRunner);

const config: PartialStrykerOptions = {
  ...runnerOptions,
  concurrency,
  checkers: ['typescript'],
  tsconfigFile: 'packages/eslint-plugin-lz-oop/tsconfig.json',
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation/eslint-plugin-lz-oop.html' },
  mutate: ['packages/eslint-plugin-lz-oop/src/**/*.ts', '!packages/eslint-plugin-lz-oop/src/**/*.test.ts'],
  ignorePatterns: ['/.oracle', '/plans', '/reports', '/dist', '/.nx', '/evals'],
  incrementalFile: 'reports/stryker-incremental/eslint-plugin-lz-oop.json',
};

export default config;
