import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modulesMissingFromRegistry } from '../testing/registered-modules.ts';
import { codemods } from './index.ts';

test('every codemod file in this folder is registered under its file name and has a test beside it', () => {
  assert.deepEqual(modulesMissingFromRegistry(new URL('.', import.meta.url), Object.keys(codemods)), []);
});
