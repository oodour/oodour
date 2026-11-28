import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installedRule, isRuleModule } from './installed-rules.ts';

test('a rule module is an object with a create function', () => {
  assert.equal(isRuleModule({ create: () => ({}) }), true);
});

const notRuleModules: Readonly<Record<string, unknown>> = {
  'a string': 'create',
  null: null,
  'an object without create': {},
  'an object whose create is not a function': { create: 'create' },
};

Object.entries(notRuleModules).forEach(([what, value]) => {
  test(`${what} is not a rule module`, () => {
    assert.equal(isRuleModule(value), false);
  });
});

test('installedRule finds a core rule by the name its catalog row gives', () => {
  assert.equal(
    typeof installedRule({ source: 'core', name: 'complexity' })?.create,
    'function',
  );
});

test('installedRule has no rule for a name its package lacks, or one it only inherits', () => {
  assert.equal(
    installedRule({ source: 'core', name: 'no-such-rule' }),
    undefined,
  );
  assert.equal(installedRule({ source: 'core', name: 'toString' }), undefined);
});
