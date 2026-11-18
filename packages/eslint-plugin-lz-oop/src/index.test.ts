import assert from 'node:assert/strict';
import { test } from 'node:test';
import plugin, { lzOopRules } from './index.ts';

test('lzOopRules holds every rule of this plugin that a config turns on', () => {
  const prefix = `${plugin.meta.namespace}/`;
  const turnedOn = Object.values(plugin.configs)
    .flat()
    .flatMap(({ rules = {} }) => Object.entries(rules))
    .flatMap(([id, setting]) => (id.startsWith(prefix) && setting !== 'off' ? [id.slice(prefix.length)] : []));

  assert.deepEqual(
    [...new Set(turnedOn)].filter((name) => !Object.hasOwn(lzOopRules, name)),
    [],
  );
  assert.ok(turnedOn.length > 0);
});
