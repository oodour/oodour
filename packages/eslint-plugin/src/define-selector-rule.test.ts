import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { testRule } from './testing/rule-testers.ts';
import { defineSelectorRule, type SelectorRow } from './define-selector-rule.ts';

const debuggerRow: SelectorRow = {
  name: 'debugger-statement',
  description: 'Report a debugger statement',
  concept: 'Some concept',
  cures: ['Some cure'],
  tier: 'strict',
  selectors: ['DebuggerStatement', 'LabeledStatement'],
  message: 'A debugger statement.',
  because: 'a person decides',
};

testRule(defineSelectorRule(debuggerRow), {
  valid: ['const a = 1;'],
  invalid: [
    { code: 'debugger;', errors: [{ messageId: 'found' }] },
    { code: 'outer: for (;;) {}', errors: [{ messageId: 'found' }] },
  ],
});

const removeDebuggerRow: SelectorRow = {
  name: 'debugger-statement-suggested',
  description: 'Report a debugger statement',
  concept: 'Some concept',
  cures: ['Some cure'],
  tier: 'strict',
  selectors: ['DebuggerStatement'],
  message: 'A debugger statement.',
  suggest: {
    message: 'Remove the debugger statement.',
    because: 'it may be there on purpose',
    fix: (node, fixer) => fixer.remove(node),
  },
};

testRule(defineSelectorRule(removeDebuggerRow), {
  valid: [],
  invalid: [
    {
      code: 'debugger;',
      errors: [{ messageId: 'found', suggestions: [{ messageId: 'suggestion', output: '' }] }],
    },
  ],
});

const fixDebuggerRow: SelectorRow = {
  name: 'debugger-statement-fixed',
  description: 'Report a debugger statement',
  concept: 'Some concept',
  cures: ['Some cure'],
  tier: 'strict',
  selectors: ['DebuggerStatement'],
  message: 'A debugger statement.',
  fix: (node, fixer) => fixer.remove(node),
};

testRule(defineSelectorRule(fixDebuggerRow), {
  valid: [],
  invalid: [{ code: 'debugger;', output: '', errors: [{ messageId: 'found' }] }],
});

test('a row with a fix declares remedy "fix"', () => {
  assert.deepEqual(defineSelectorRule(fixDebuggerRow).meta.docs.remedy, { kind: 'fix' });
});

test('a selector with a child step inside :has is refused, because esquery matches nothing for a longer one', () => {
  assert.throws(
    () => defineSelectorRule({ ...debuggerRow, selectors: ['ClassBody:has(> MethodDefinition > FunctionExpression)'] }),
    /debugger-statement: .*:has\(>/,
  );
});

test('the installed esquery still matches nothing for a two-step child chain in :has, which the refusal above guards', () => {
  const linter = new Linter();
  const hits = (selector: string): number =>
    linter.verify('class A { m() { this.x = 1; return 2; } }', {
      languageOptions: { parser: tseslint.parser },
      rules: { 'no-restricted-syntax': ['error', selector] },
    }).length;

  assert.deepEqual(
    [
      hits('MethodDefinition:has(> FunctionExpression > BlockStatement)'),
      hits('MethodDefinition:has(BlockStatement)'),
      hits('ExpressionStatement ~ ReturnStatement'),
    ],
    [0, 1, 1],
  );
});

test("a suggestion is offered in the row's own words", () => {
  assert.equal(defineSelectorRule(removeDebuggerRow).meta.messages.suggestion, 'Remove the debugger statement.');
});

test('a row with only a reason declares remedy "none" with that reason', () => {
  assert.deepEqual(defineSelectorRule(debuggerRow).meta.docs.remedy, { kind: 'none', because: 'a person decides' });
});

test('a row with a suggestion declares remedy "suggestion" with its reason', () => {
  assert.deepEqual(defineSelectorRule(removeDebuggerRow).meta.docs.remedy, {
    kind: 'suggestion',
    because: 'it may be there on purpose',
  });
});
