import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FunctionSite } from './functions.ts';
import { measuredFromIstanbul, parseCoverageMap } from './istanbul.ts';

const settle: FunctionSite = {
  name: "Function 'settle'",
  complexity: 2,
  start: { line: 1, column: 7 },
  bodyStart: { line: 1, column: 37 },
  end: { line: 4, column: 1 },
  publicMethod: false,
};

test("a function's coverage is the share of its statements that ran, joined to it by where its body starts", () => {
  const coverage = {
    fnMap: { '0': { name: 'settle', loc: { start: { line: 1, column: 37 }, end: { line: 4, column: 1 } } } },
    f: { '0': 1 },
    statementMap: {
      '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 31 } },
      '1': { start: { line: 3, column: 2 }, end: { line: 3, column: 21 } },
    },
    s: { '0': 1, '1': 0 },
  };

  assert.deepEqual(measuredFromIstanbul('src/order.ts', [settle], coverage), [
    { file: 'src/order.ts', line: 1, name: "Function 'settle'", complexity: 2, coverage: 0.5 },
  ]);
});

test('a function with no statements of its own is covered when a test called it, and uncovered when none did', () => {
  const noop: FunctionSite = {
    name: "Method 'reset'",
    complexity: 1,
    start: { line: 2, column: 7 },
    bodyStart: { line: 2, column: 10 },
    end: { line: 2, column: 12 },
    publicMethod: false,
  };
  const coverageWhenCalled = (calls: number) => ({
    fnMap: { '0': { name: 'reset', loc: { start: { line: 2, column: 10 }, end: { line: 2, column: 12 } } } },
    f: { '0': calls },
    statementMap: {},
    s: {},
  });

  assert.deepEqual(
    [1, 0].map((calls) => measuredFromIstanbul('src/cart.ts', [noop], coverageWhenCalled(calls))[0]?.coverage),
    [1, 0],
  );
});

test('a function the coverage does not list, such as a class field initializer, gets no score', () => {
  const initializer: FunctionSite = {
    name: 'Class field initializer',
    complexity: 2,
    start: { line: 2, column: 10 },
    bodyStart: { line: 2, column: 10 },
    end: { line: 2, column: 39 },
    publicMethod: false,
  };
  const coverage = {
    fnMap: {},
    f: {},
    statementMap: { '0': { start: { line: 2, column: 10 }, end: { line: 2, column: 39 } } },
    s: { '0': 0 },
  };

  assert.deepEqual(measuredFromIstanbul('src/cart.ts', [initializer], coverage), []);
});

test('a statement inside a nested function counts for the nested function only', () => {
  const outer: FunctionSite = { ...settle, end: { line: 5, column: 1 } };
  const inner: FunctionSite = {
    name: 'Arrow function',
    complexity: 1,
    start: { line: 2, column: 15 },
    bodyStart: { line: 2, column: 22 },
    end: { line: 2, column: 40 },
    publicMethod: false,
  };
  const coverage = {
    fnMap: {
      '0': { name: 'settle', loc: { start: { line: 1, column: 37 }, end: { line: 5, column: 1 } } },
      '1': { name: 'pick', loc: { start: { line: 2, column: 22 }, end: { line: 2, column: 40 } } },
    },
    f: { '0': 1, '1': 0 },
    statementMap: {
      '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 41 } },
      '1': { start: { line: 2, column: 22 }, end: { line: 2, column: 40 } },
      '2': { start: { line: 3, column: 2 }, end: { line: 3, column: 20 } },
    },
    s: { '0': 1, '1': 0, '2': 1 },
  };

  assert.deepEqual(
    measuredFromIstanbul('src/order.ts', [outer, inner], coverage).map(({ coverage: share }) => share),
    [1, 0],
  );
});

test("Vitest's coverage map gives each file's coverage by its path, read through the map's own JSON form", () => {
  const order = {
    path: 'D:/app/src/order.ts',
    fnMap: { '0': { name: 'settle', loc: { start: { line: 1, column: 37 }, end: { line: 4, column: 1 } } } },
    f: { '0': 1 },
    statementMap: { '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 31 } } },
    s: { '0': 1 },
  };
  const coverageMap = { toJSON: () => ({ [order.path]: order }) };

  assert.deepEqual([...parseCoverageMap(coverageMap)], [[order.path, order]]);
});

test('a coverage map that is not files of Istanbul coverage stops the reporter, naming the file it could not read', () => {
  const statementWithoutEnd = {
    fnMap: {},
    f: {},
    statementMap: { '0': { start: { line: 2, column: 2 } } },
    s: { '0': 1 },
  };

  assert.throws(() => parseCoverageMap({ 'D:/app/src/order.ts': statementWithoutEnd }), /D:\/app\/src\/order\.ts/u);
  assert.throws(() => parseCoverageMap([]), /not an object of files/u);
});
