import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existingRules, listExistingRules } from './existing-rules.ts';
import { installedRule } from './testing/installed-rules.ts';
import { testConfiguredRules } from './testing/rule-testers.ts';

const ifs = (count: number): string =>
  `function f(a) {\n${Array.from({ length: count }, (_, index) => `  if (a === ${String(index)}) { a = 0; }\n`).join('')}}`;

// Each pin sits on the boundary its catalog options draw: the last allowed shape is valid, one more step is not.
testConfiguredRules({
  'max-lines-per-function': {
    valid: ['function f() {\n  const a = 1;\n\n  // note\n  const b = 2;\n  const c = 3;\n  const d = 4;\n  return a + b + c + d;\n}'],
    invalid: [
      {
        code: 'function f() {\n  const a = 1;\n  const b = 2;\n  const c = 3;\n  const d = 4;\n  const e = 5;\n  return a + b + c + d + e;\n}',
        errors: [{ messageId: 'exceed' }],
      },
    ],
  },
  'max-statements': {
    valid: ['function f() { let a = 1; a += 1; a += 1; a += 1; return a; }'],
    invalid: [{ code: 'function f() { let a = 1; a += 1; a += 1; a += 1; a += 1; return a; }', errors: [{ messageId: 'exceed' }] }],
  },
  'max-params': {
    valid: ['function f(a, b, c, d) {}'],
    invalid: [{ code: 'function f(a, b, c, d, e) {}', errors: [{ messageId: 'exceed' }] }],
  },
  complexity: {
    valid: [ifs(3)],
    invalid: [{ code: ifs(4), errors: [{ messageId: 'complex' }] }],
  },
  'max-depth': {
    valid: ['function f(a) { if (a) { if (a) { a = 0; } } }'],
    invalid: [{ code: 'function f(a) { if (a) { if (a) { if (a) { a = 0; } } } }', errors: [{ messageId: 'tooDeeply' }] }],
  },
  'no-param-reassign': {
    valid: ['function f(order) { return { ...order, total: 0 }; }'],
    invalid: [{ code: 'function f(order) { order.total = 0; }', errors: [{ messageId: 'assignmentToFunctionParamProp' }] }],
  },
  '@typescript-eslint/max-params': {
    valid: ['function f(this: void, a: number, b: number, c: number, d: number) {}'],
    invalid: [{ code: 'function f(a: number, b: number, c: number, d: number, e: number) {}', errors: [{ messageId: 'exceed' }] }],
  },
  '@typescript-eslint/switch-exhaustiveness-check': {
    valid: ["declare const shape: 'circle' | 'square';\nswitch (shape) {\n  case 'circle':\n  case 'square':\n    break;\n}\n"],
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
  'sonarjs/cognitive-complexity': {
    valid: [ifs(5)],
    invalid: [{ code: ifs(6), errors: [{ messageId: 'refactorFunction' }] }],
  },
  'functional/immutable-data': {
    valid: ['class Counter { count = 0; increment(): void { this.count = this.count + 1; } }'],
    invalid: [{ code: 'function f(order: { total: number }): void { order.total = 0; }', errors: [{ messageId: 'generic' }] }],
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

test('each catalog row carries the rule ID its source prefix gives it', () => {
  const row = listExistingRules().find(({ id }) => id === 'unicorn/no-array-sort');

  assert.deepEqual(row, {
    source: 'unicorn',
    name: 'no-array-sort',
    id: 'unicorn/no-array-sort',
    stance: existingRules.unicorn.rules['no-array-sort'],
  });
});
