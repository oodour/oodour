import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionsIn } from './functions.ts';

test("each function's complexity is the count ESLint's complexity rule gives, with where it and its body start", () => {
  const source = [
    'export function settle(order: Order) {',
    '  if (order.paid) { return 0; }',
    '  return order.total;',
    '}',
    'export const double = (n: number) => n * 2;',
    'class Cart {',
    '  total = this.items.length > 0 ? 1 : 0;',
    '  static { if (globalThis.ready) { } }',
    '  get size() { return 1; }',
    '}',
  ].join('\n');

  assert.deepEqual(functionsIn('cart.ts', source), [
    {
      name: "Function 'settle'",
      complexity: 2,
      start: { line: 1, column: 7 },
      bodyStart: { line: 1, column: 37 },
    },
    {
      name: 'Arrow function',
      complexity: 1,
      start: { line: 5, column: 22 },
      bodyStart: { line: 5, column: 37 },
    },
    {
      name: 'Class field initializer',
      complexity: 2,
      start: { line: 7, column: 10 },
      bodyStart: { line: 7, column: 10 },
    },
    { name: 'Class static block', complexity: 2, start: { line: 8, column: 2 }, bodyStart: { line: 8, column: 2 } },
    { name: "Getter 'size'", complexity: 1, start: { line: 9, column: 10 }, bodyStart: { line: 9, column: 13 } },
  ]);
});
