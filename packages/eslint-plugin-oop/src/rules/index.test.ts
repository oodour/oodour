import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { rules } from './index.ts';

const files = readdirSync(import.meta.dirname);
const ruleFiles = files.filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && file !== 'index.ts');

test('every rule file is registered under its file name, and nothing else is', () => {
  assert.deepEqual(Object.keys(rules).toSorted(), ruleFiles.map((file) => file.replace(/\.ts$/, '')).toSorted());
});

test('every rule file has a test file beside it', () => {
  const untested = ruleFiles.filter((file) => !files.includes(file.replace(/\.ts$/, '.test.ts')));

  assert.deepEqual(untested, []);
});
