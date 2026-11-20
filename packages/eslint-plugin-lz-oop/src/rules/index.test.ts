import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { rules } from './index.ts';
import { selectorRules } from './selector-rules.ts';

const files = readdirSync(import.meta.dirname);
const ruleFiles = files.filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && file !== 'index.ts');
const selectorTable = 'selector-rules.ts';

test('every rule file and every selector table row is registered under its name, and nothing else is', () => {
  const expected = [
    ...ruleFiles.filter((file) => file !== selectorTable).map((file) => file.replace(/\.ts$/, '')),
    ...selectorRules.map(({ name }) => name),
  ];

  assert.deepEqual(Object.keys(rules).toSorted(), expected.toSorted());
});

test('every rule names the concept it prompts a look at and describes itself', () => {
  const undocumented = Object.entries(rules).flatMap(([name, { meta }]) =>
    meta.docs.concept.length > 0 && meta.docs.description.length > 0 ? [] : [name],
  );

  assert.deepEqual(undocumented, []);
});

test('every report message is a stop-and-look message that names the smell of its concept and a cure', () => {
  const nonConforming = Object.entries(rules).flatMap(([name, { meta }]) =>
    Object.entries(meta.messages).flatMap(([messageId, message]) =>
      messageId === 'suggestion' ||
      (message.startsWith(`Stop and look: ${meta.docs.concept},`) && message.includes('Cure: '))
        ? []
        : [`${name}:${messageId}`],
    ),
  );

  assert.deepEqual(nonConforming, []);
});

test('every rule file has a test file beside it', () => {
  const untested = ruleFiles.filter((file) => !files.includes(file.replace(/\.ts$/, '.test.ts')));

  assert.deepEqual(untested, []);
});
