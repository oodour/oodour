// Mutation testing for the repository's tooling: the hooks, the mods' logic and the tools.
//
// With LZ_NODE_TEST_RUNNER set to the runner's source entry in an lz-node-test checkout at a pinned commit, Stryker runs
// lz-node-test's node:test runner, which runs per mutant only the test files whose tests reach it, and adds that
// checkout's Node.js mutators and numeric-literal mutator to Stryker's own:
//   LZ_NODE_TEST_RUNNER=<checkout>/packages/stryker-node-test-runner/src/index.ts \
//     node --conditions=@oodour/source node_modules/@stryker-mutator/core/bin/stryker.js run stryker.config.ts
// Unset, it falls back to Stryker's command runner, which runs the whole suite for every mutant.
// Stryker finds no .ts configuration by itself, so every run names this file.
// While iterating, add --incremental; finish with one run without it, as an incremental run copies older results into
// the report and misses changes to test utilities, fixtures and config.
import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { nodeTestRunnerOptions, sharedOptions } from './stryker.shared.ts';

const { LZ_NODE_TEST_RUNNER: nodeTestRunner } = process.env;
const testFiles = [
  '*.test.ts',
  '.claude/hooks/*.test.ts',
  'tools/*.test.ts',
  'tools/nx/*.test.ts',
  '.claude/mods/oracle-scrub/.node-test/*.test.ts',
  '.claude/mods/oracle-guard/.node-test/*.test.ts',
];
// The sandbox holds no sealed store and no eval cases, so the tests that read the real ones are skipped.
const skipPattern = '--test-skip-pattern=the real (store|eval cases)';

const runnerOptions: PartialStrykerOptions =
  nodeTestRunner === undefined
    ? {
        testRunner: 'command',
        commandRunner: { command: ['node', '--test', skipPattern, ...testFiles].map((part) => `"${part}"`).join(' ') },
      }
    : { ...(await nodeTestRunnerOptions(nodeTestRunner)), lzNodeTest: { testFiles, nodeArgs: [skipPattern] } };

const config: PartialStrykerOptions = {
  ...sharedOptions,
  ...runnerOptions,
  tsconfigFile: 'tsconfig.json',
  mutate: [
    '.claude/hooks/*.ts',
    '!.claude/hooks/*.test.ts',
    '.claude/mods/oracle-scrub/hooks/scrub.ts',
    '.claude/mods/oracle-guard/hooks/decide.ts',
    '.claude/mods/oracle-guard/hooks/paths.ts',
    'tools/**/*.ts',
    '!tools/**/*.test.ts',
  ],
  incrementalFile: 'reports/stryker-incremental/oodour.json',
};

export default config;
