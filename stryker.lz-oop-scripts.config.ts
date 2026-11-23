import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { nodeTestRunnerOptions, sharedOptions } from './stryker.shared.ts';

const { LZ_NODE_TEST_RUNNER: nodeTestRunner } = process.env;
const testFiles = 'plugins/lz-oop/scripts/*.test.ts';

const runnerOptions: PartialStrykerOptions =
  nodeTestRunner === undefined
    ? { testRunner: 'command', commandRunner: { command: `node --test "${testFiles}"` }, timeoutMS: 60000 }
    : { ...(await nodeTestRunnerOptions(nodeTestRunner)), lzNodeTest: { testFiles: [testFiles] }, timeoutMS: 60000 };

const config: PartialStrykerOptions = {
  ...sharedOptions,
  ...runnerOptions,
  tsconfigFile: 'plugins/lz-oop/scripts/tsconfig.json',
  htmlReporter: { fileName: 'reports/mutation/lz-oop-scripts.html' },
  mutate: ['plugins/lz-oop/scripts/*.ts', '!plugins/lz-oop/scripts/*.test.ts'],
  incrementalFile: 'reports/stryker-incremental/lz-oop-scripts.json',
};

export default config;
