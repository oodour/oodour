import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join, parse } from 'node:path';
import { functionsIn } from './functions.ts';

test('a file outside the folder the run started in is counted too, as a coverage run of a monorepo package reaches it', () => {
  const outside = join(parse(process.cwd()).root, 'elsewhere', 'settle.ts');

  assert.deepEqual(
    functionsIn(outside, 'export function settle(paid: boolean) { return paid ? 0 : 1; }').map(({ name }) => name),
    ["Function 'settle'"],
  );
});

test('a source that switches lint rules off in a comment is counted, whichever rules the comment names', () => {
  const source = [
    '// eslint-disable-next-line no-console',
    'export function settle() { return 1; }',
    '/* eslint-disable @typescript-eslint/no-explicit-any */',
    'export function total() { return 2; }',
  ].join('\n');

  assert.deepEqual(
    functionsIn('src/order.ts', source).map(({ name }) => name),
    ["Function 'settle'", "Function 'total'"],
  );
});

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
      publicMethod: false,
    },
    {
      name: "Arrow function 'double'",
      complexity: 1,
      start: { line: 5, column: 22 },
      bodyStart: { line: 5, column: 37 },
      end: { line: 5, column: 42 },
      publicMethod: false,
    },
    {
      name: 'Class field initializer',
      complexity: 2,
      start: { line: 7, column: 10 },
      bodyStart: { line: 7, column: 10 },
      end: { line: 7, column: 39 },
      publicMethod: false,
    },
    {
      name: 'Class static block',
      complexity: 2,
      start: { line: 8, column: 2 },
      bodyStart: { line: 8, column: 2 },
      end: { line: 8, column: 38 },
      publicMethod: false,
    },
    {
      name: "Getter 'size'",
      complexity: 1,
      start: { line: 9, column: 10 },
      bodyStart: { line: 9, column: 13 },
      end: { line: 9, column: 26 },
      publicMethod: true,
    },
  ]);
});

test('a public method or accessor of a class is marked as one; private, protected and constructors are not', () => {
  const source = [
    'export class Shop {',
    '  constructor() {}',
    '  price() { return 1; }',
    '  static open() { return 1; }',
    '  get size() { return 1; }',
    '  #audit() { return 1; }',
    '  private hidden() { return 1; }',
    '  protected kept() { return 1; }',
    '}',
    'export function label() { return 1; }',
    'export const till = { open() { return 1; } };',
  ].join('\n');

  assert.deepEqual(
    functionsIn('shop.ts', source).map(({ name, publicMethod }) => [name, publicMethod]),
    [
      ['Constructor', false],
      ["Method 'price'", true],
      ["Static method 'open'", true],
      ["Getter 'size'", true],
      ['Private method #audit', false],
      ["Method 'hidden'", false],
      ["Method 'kept'", false],
      ["Function 'label'", false],
      ["Method 'open'", false],
    ],
  );
});

test('an unnamed function takes the name of the variable it is the value of, and of nothing else that has a name', () => {
  const source = ['export const double = (n: number) => n * 2;', 'class Base extends (function () {}) {}'].join('\n');

  assert.deepEqual(
    functionsIn('base.ts', source).map(({ name }) => name),
    ["Arrow function 'double'", 'Function'],
  );
});
