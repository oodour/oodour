import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionsIn } from './functions.ts';

test('a source ESLint cannot parse stops the count with the file and the parse error, rather than counting nothing', () => {
  assert.throws(() => functionsIn('src/broken.ts', 'export function settle( {'), /src\/broken\.ts:1:\d+ .+/);
});

test("each function's complexity is the count ESLint's complexity rule gives, with where it starts, its body starts and it ends", () => {
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
      end: { line: 4, column: 1 },
    },
    {
      name: "Arrow function 'double'",
      complexity: 1,
      start: { line: 5, column: 22 },
      bodyStart: { line: 5, column: 37 },
      end: { line: 5, column: 42 },
    },
    {
      name: 'Class field initializer',
      complexity: 2,
      start: { line: 7, column: 10 },
      bodyStart: { line: 7, column: 10 },
      end: { line: 7, column: 39 },
    },
    {
      name: 'Class static block',
      complexity: 2,
      start: { line: 8, column: 2 },
      bodyStart: { line: 8, column: 2 },
      end: { line: 8, column: 38 },
    },
    {
      name: "Getter 'size'",
      complexity: 1,
      start: { line: 9, column: 10 },
      bodyStart: { line: 9, column: 13 },
      end: { line: 9, column: 26 },
    },
  ]);
});
