import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existingRules, listExistingRules } from './existing-rules.ts';
import { rules } from './rules/index.ts';
import { installedRule } from './testing/installed-rules.ts';
import { testConfiguredRules } from './testing/rule-testers.ts';

// Each pin sits on the boundary its catalog options draw: the last allowed shape is valid, one more step is not.
testConfiguredRules({
  'no-param-reassign': {
    valid: ['function f(order) { return { ...order, total: 0 }; }'],
    invalid: [
      {
        code: 'function f(order) { order.total = 0; }',
        errors: [{ messageId: 'assignmentToFunctionParamProp' }],
      },
    ],
  },
  '@typescript-eslint/switch-exhaustiveness-check': {
    valid: [
      "declare const shape: 'circle' | 'square';\nswitch (shape) {\n  case 'circle':\n  case 'square':\n    break;\n}\n",
    ],
    invalid: [
      {
        code: "declare const shape: 'circle' | 'square';\nswitch (shape) {\n  case 'circle':\n    break;\n  default:\n    break;\n}\n",
        errors: [
          {
            messageId: 'switchIsNotExhaustive',
            suggestions: [
              {
                messageId: 'addMissingCases',
                output:
                  "declare const shape: 'circle' | 'square';\nswitch (shape) {\n  case 'circle':\n    break;\n  case \"square\": { throw new Error('Not implemented yet: \"square\" case') }\n  default:\n    break;\n}\n",
              },
            ],
          },
        ],
      },
    ],
  },
  '@typescript-eslint/method-signature-style': {
    valid: ['interface Pricing { total: (quantity: number) => number }'],
    invalid: [
      {
        code: 'interface Pricing { total(quantity: number): number }',
        output: 'interface Pricing { total: (quantity: number) => number }',
        errors: [{ messageId: 'errorMethod' }],
      },
    ],
  },
  '@eslint-community/eslint-comments/require-description': {
    valid: [
      '// eslint-disable-next-line no-console -- the CLI prints its result\nconsole.log(1);',
      '/* eslint-disable no-console -- the CLI prints its result */\nconsole.log(1);\n/* eslint-enable no-console */',
      '/* global answer */\nanswer;',
    ],
    invalid: [
      {
        code: '// eslint-disable-next-line no-console\nconsole.log(1);',
        errors: [{ messageId: 'missingDescription' }],
      },
      {
        code: '/* eslint no-console: "off" */\nconsole.log(1);',
        errors: [{ messageId: 'missingDescription' }],
      },
    ],
  },
  'functional/immutable-data': {
    valid: [
      'class Counter { count = 0; increment(): void { this.count = this.count + 1; } }',
    ],
    invalid: [
      {
        code: 'function f(order: { total: number }): void { order.total = 0; }',
        errors: [{ messageId: 'generic' }],
      },
    ],
  },
});

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

test('every duplicate is turned off in favour of a rule of this plugin, which reports it under our message', () => {
  const elsewhere = listExistingRules().flatMap(({ id, stance }) =>
    'duplicateOf' in stance &&
    !Object.hasOwn(rules, stance.duplicateOf.replace('@oodour/', ''))
      ? [id]
      : [],
  );

  assert.deepEqual(elsewhere, []);
});

test('each catalog row carries the rule ID its source prefix gives it', () => {
  const row = listExistingRules().find(
    ({ id }) => id === 'unicorn/no-array-sort',
  );

  assert.deepEqual(row, {
    source: 'unicorn',
    name: 'no-array-sort',
    id: 'unicorn/no-array-sort',
    stance: existingRules.unicorn.rules['no-array-sort'],
  });
});
