import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modulesMissingFromRegistry } from '../testing/registered-modules.ts';
import { rules } from './index.ts';

test('every rule file in this folder is registered under its file name and has a test beside it', () => {
  assert.deepEqual(modulesMissingFromRegistry(new URL('.', import.meta.url), Object.keys(rules)), []);
});

test('every rule says how a reader gets from the report to changed code', () => {
  // TODO: for each rule: docs.remedy is set; for kind 'none' and 'codemod' every message ends with the remedy
  // sentence (createRule appended it); for 'fix' meta.fixable is 'code'; for 'suggestion' meta.hasSuggestions.
  throw new Error('not implemented');
});
