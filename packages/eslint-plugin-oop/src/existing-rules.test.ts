import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existingRules, listExistingRules } from './existing-rules.ts';
import { installedRule } from './testing/installed-rules.ts';

// ESLint never looks up a rule that is off, so a misspelled conflict would pass silently without this check.
test('every rule the catalog names exists in its installed package', () => {
  const missing = listExistingRules()
    .filter((row) => installedRule(row) === undefined)
    .map(({ id }) => id);

  assert.deepEqual(missing, []);
});

test('no cue is deprecated in its installed package', () => {
  const deprecated = listExistingRules()
    .filter(({ stance }) => 'cue' in stance)
    .filter((row) => Boolean(installedRule(row)?.meta?.deprecated))
    .map(({ id }) => id);

  assert.deepEqual(deprecated, []);
});

test('each catalog row carries the rule ID its source prefix gives it', () => {
  const row = listExistingRules().find(({ id }) => id === 'unicorn/no-array-sort');

  assert.deepEqual(row, {
    source: 'unicorn',
    name: 'no-array-sort',
    id: 'unicorn/no-array-sort',
    stance: existingRules.unicorn.rules['no-array-sort'],
  });
});
