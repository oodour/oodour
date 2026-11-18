import { test } from 'node:test';

// The remedy contract is tested once, here, for all rules: no rule test repeats it.

test('a rule with remedy "fix" gets meta.fixable "code" and no remedy sentence', () => {
  throw new Error('not implemented');
});

test('a rule with remedy "suggestion" gets meta.hasSuggestions and no remedy sentence', () => {
  throw new Error('not implemented');
});

test('a rule with remedy "codemod" ends every message with the command that codemodCommand returns', () => {
  throw new Error('not implemented');
});

test('a rule with remedy "none" ends every message with why no automatic change exists', () => {
  throw new Error('not implemented');
});

test('the docs URL is derived from the rule name', () => {
  throw new Error('not implemented');
});
