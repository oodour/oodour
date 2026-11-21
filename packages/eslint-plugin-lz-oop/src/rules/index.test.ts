import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

test("every rule's concept is an entry, a name in bold, in the plugin's references", () => {
  const referencesDir = join(import.meta.dirname, '..', '..', '..', '..', 'plugins', 'lz-oop', 'references');
  const references = readdirSync(referencesDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => readFileSync(join(referencesDir, file), 'utf8'))
    .join('\n');
  const uncatalogued = Object.entries(rules).flatMap(([name, { meta }]) =>
    references.includes(`**${meta.docs.concept}**`) ? [] : [`${name}: ${meta.docs.concept}`],
  );

  assert.deepEqual(uncatalogued, []);
});

test('every rule lists the cures its report messages name, and names each in every one', () => {
  const unnamed = Object.entries(rules).flatMap(([name, { meta }]) =>
    meta.docs.cures.length === 0
      ? [`${name}: no cure`]
      : Object.entries(meta.messages).flatMap(([messageId, message]) =>
          meta.docs.cures
            // A blank name is in every message, so it would pass unseen.
            .filter((cure) => cure.trim() === '' || !message.includes(cure))
            .map((cure) => `${name}:${messageId}: '${cure}'`),
        ),
  );

  assert.deepEqual(unnamed, []);
});

test("every cure a rule lists is explained in the plugin's references", () => {
  const referencesDir = join(import.meta.dirname, '..', '..', '..', '..', 'plugins', 'lz-oop', 'references');
  // Prettier wraps the references, so a name can break across lines.
  const references = readdirSync(referencesDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => readFileSync(join(referencesDir, file), 'utf8'))
    .join('\n')
    .replaceAll(/\s+/gu, ' ');
  const unexplained = Object.entries(rules).flatMap(([name, { meta }]) =>
    meta.docs.cures.filter((cure) => !references.includes(cure)).map((cure) => `${name}: ${cure}`),
  );

  assert.deepEqual(unexplained, []);
});

test('every report message is a stop-and-look message that names its concept and a cure', () => {
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
