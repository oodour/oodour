// The options every Stryker configuration shares: stryker.config.ts for the tooling,
// stryker.eslint-plugin.config.ts for the ESLint plugin and stryker.test-metrics.config.ts for the
// test reporters.
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
