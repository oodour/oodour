import assert from 'node:assert/strict';
import { test } from 'node:test';
import plugin, { oodourRules } from './index.ts';

test('oodourRules holds every rule of this plugin that a config turns on', () => {
  const prefix = `${plugin.meta.namespace}/`;
  const turnedOn = Object.values(plugin.configs)
    .flat()
    .flatMap(({ rules = {} }) => Object.entries(rules))
    .flatMap(([id, setting]) =>
      id.startsWith(prefix) && setting !== 'off'
        ? [id.slice(prefix.length)]
        : [],
    );

  assert.deepEqual(
    [...new Set(turnedOn)].filter((name) => !Object.hasOwn(oodourRules, name)),
    [],
  );
  assert.ok(turnedOn.length > 0);
});
