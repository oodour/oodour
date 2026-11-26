import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { resolveCoreFrom } from './stryker.sandbox-core.ts';

const sandbox = join(import.meta.dirname, '.stryker-tmp', 'sandbox-1');
const context = { conditions: [], importAttributes: {}, parentURL: undefined };

test('resolves @oodour/core to the core source under the directory', () => {
  const resolved = resolveCoreFrom(sandbox)('@oodour/core', context, () => {
    throw new Error('not reached');
  });

  assert.deepEqual(resolved, {
    url: pathToFileURL(join(sandbox, 'packages/core/src/index.ts')).href,
    shortCircuit: true,
  });
});

test('passes every other specifier on, a subpath of the core included', () => {
  const seen: string[] = [];
  const next = (specifier: string) => {
    seen.push(specifier);

    return { url: `file:///${specifier}` };
  };

  resolveCoreFrom(sandbox)('@oodour/core/package.json', context, next);
  resolveCoreFrom(sandbox)('node:fs', context, next);

  assert.deepEqual(seen, ['@oodour/core/package.json', 'node:fs']);
});
