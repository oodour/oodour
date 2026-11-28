// The options every Stryker configuration shares: stryker.config.ts for the tooling, stryker.oodour-scripts.config.ts
// for the plugin's scripts, stryker.core.config.ts for the core, stryker.eslint-plugin.config.ts for the ESLint plugin
// and stryker.test-metrics.config.ts for the test reporters.
import { availableParallelism, freemem } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { PartialStrykerOptions } from '@stryker-mutator/api/core';

// The share of memory and cores one checker or test runner process takes, measured by lz-gardening with the
// lz-node-test runner and the TypeScript checker (0.24 to 0.29 GB), and the 4 GB that stays free for the machine's
// other sessions.
const gbPerUnit = 0.3;
const reservedGb = 4;

export const sharedOptions = {
  concurrency: Math.max(2, Math.min(availableParallelism() - 1, Math.floor((freemem() / 2 ** 30 - reservedGb) / gbPerUnit))),
  checkers: ['typescript'],
  reporters: ['clear-text', 'progress', 'html'],
  ignorePatterns: ['/.oracle', '/plans', '/reports', '/dist', '/.nx', '/evals'],
} satisfies PartialStrykerOptions;

/**
 * The node argument that makes a test file's imports of a workspace package, such as `@oodour/core`, load its source
 * rather than its build, which may be stale or missing. The test processes need it of their own, as they do not inherit
 * Stryker's.
 */
const sourceCondition = '--conditions=@oodour/source';

/**
 * The argument that points a test process's `@oodour/core` imports at the sandbox's copy of the core (see
 * stryker.sandbox-core.ts), for the packages whose tests reach the core.
 */
export const sandboxCore = '--import=./stryker.sandbox-core.ts';

export interface RunnerSetup {
  readonly testFiles: readonly string[];
  /** Node arguments for the test processes beside `sourceCondition`. */
  readonly nodeArgs?: readonly string[];
  /** The command runner's timeout, which runs the whole suite per mutant. */
  readonly commandTimeoutMS: number;
  readonly timeoutFactor?: number;
}

/**
 * The test runner options of a package's configuration. With LZ_NODE_TEST_RUNNER set to the runner's source entry in an
 * lz-node-test checkout at a pinned commit, lz-node-test's node:test runner, which runs per mutant only the test files
 * whose tests reach it; unset, Stryker's command runner, which runs the whole suite for every mutant.
 */
export async function runnerOptions({
  testFiles,
  nodeArgs = [],
  commandTimeoutMS,
  timeoutFactor,
}: RunnerSetup): Promise<PartialStrykerOptions> {
  const { LZ_NODE_TEST_RUNNER: nodeTestRunner } = process.env;
  const args = [sourceCondition, ...nodeArgs];

  if (nodeTestRunner === undefined) {
    const files = testFiles.map((pattern) => `"${pattern}"`).join(' ');

    return { testRunner: 'command', commandRunner: { command: `node ${args.join(' ')} --test ${files}` }, timeoutMS: commandTimeoutMS };
  }

  return {
    ...(await nodeTestRunnerOptions(nodeTestRunner)),
    lzNodeTest: { testFiles: [...testFiles], nodeArgs: args },
    ...(timeoutFactor === undefined ? {} : { timeoutFactor }),
    timeoutMS: 60000,
  };
}

/**
 * The options that run lz-node-test's node:test runner from its source entry in a pinned lz-node-test checkout, after
 * adding that checkout's Node.js mutators and numeric-literal mutator to Stryker's own. Its packages load from source
 * only under lz-node-test's own export condition, `@layzee/source`, so every `mutate` command passes it beside ours.
 */
export async function nodeTestRunnerOptions(runner: string): Promise<PartialStrykerOptions> {
  const packages = new URL('../../', pathToFileURL(runner));

  await callExport(new URL('stryker-node-mutators/src/index.ts', packages), 'lzNodeMutators');
  await callExport(new URL('stryker-js-mutators/src/index.ts', packages), 'lzJsMutators', { LzJsNumericLiteral: true });

  return { testRunner: 'lz-node-test', appendPlugins: [runner], coverageAnalysis: 'perTest' };
}

async function callExport(module: URL, name: string, ...args: unknown[]): Promise<void> {
  const exports: unknown = await import(module.href);
  const exported: unknown = typeof exports === 'object' && exports !== null ? Reflect.get(exports, name) : undefined;

  if (typeof exported !== 'function') {
    throw new TypeError(`${module.href} exports no function named ${name}.`);
  }

  const result: unknown = Reflect.apply(exported, undefined, args);

  await result;
}
