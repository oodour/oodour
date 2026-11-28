import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRule, type Remedy } from './create-rule.ts';

function ruleWith(remedy: Remedy) {
  return createRule({
    name: 'some-rule',
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Some rule',
        concept: 'Some concept',
        cures: ['Some cure'],
        requiresTypeChecking: false,
        remedy,
        tier: 'strict',
      },
      messages: { first: 'First problem.', second: 'Second problem.' },
      schema: [],
      defaultOptions: [],
    },
    create: () => ({}),
  });
}

test('a rule with remedy "fix" gets meta.fixable "code" and keeps its messages as written', () => {
  const rule = ruleWith({ kind: 'fix' });

  assert.equal(rule.meta.fixable, 'code');
  assert.equal(rule.meta.hasSuggestions, undefined);
  assert.deepEqual(rule.meta.messages, {
    first: 'First problem.',
    second: 'Second problem.',
  });
});

test('a rule with remedy "suggestion" gets meta.hasSuggestions, no fixable, and keeps its messages as written', () => {
  const rule = ruleWith({
    kind: 'suggestion',
    because: 'a person has to confirm the new name',
  });

  assert.equal(rule.meta.hasSuggestions, true);
  assert.equal(rule.meta.fixable, undefined);
  assert.deepEqual(rule.meta.messages, {
    first: 'First problem.',
    second: 'Second problem.',
  });
});

test("the docs URL points at the readme of the plugin's public repository", () => {
  const rule = ruleWith({ kind: 'fix' });

  assert.equal(
    rule.meta.docs.url,
    'https://github.com/oodour/oodour#readme-ov-file',
  );
});

test('a rule with remedy "none" ends every message with why no automatic change exists', () => {
  const rule = ruleWith({ kind: 'none', because: 'the cure needs a person' });

  assert.deepEqual(rule.meta.messages, {
    first: 'First problem. No automatic change: the cure needs a person.',
    second: 'Second problem. No automatic change: the cure needs a person.',
  });
});
