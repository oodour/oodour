import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { nodeTestRunnerOptions, sharedOptions } from './stryker.shared.ts';

const { LZ_NODE_TEST_RUNNER: nodeTestRunner } = process.env;
const testFiles = 'plugins/oodour/scripts/*.test.ts';

const runnerOptions: PartialStrykerOptions =
  nodeTestRunner === undefined
    ? { testRunner: 'command', commandRunner: { command: `node --test "${testFiles}"` }, timeoutMS: 60000 }
    : { ...(await nodeTestRunnerOptions(nodeTestRunner)), lzNodeTest: { testFiles: [testFiles] }, timeoutMS: 60000 };

const config: PartialStrykerOptions = {
  ...sharedOptions,
  ...runnerOptions,
  tsconfigFile: 'plugins/oodour/scripts/tsconfig.json',
  htmlReporter: { fileName: 'reports/mutation/oodour-scripts.html' },
  mutate: ['plugins/oodour/scripts/*.ts', '!plugins/oodour/scripts/*.test.ts', '!plugins/oodour/scripts/fixtures.ts'],
  incrementalFile: 'reports/stryker-incremental/oodour-scripts.json',
};

export default config;
