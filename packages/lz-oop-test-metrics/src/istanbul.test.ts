import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FunctionSite } from './functions.ts';
import { measuredFromIstanbul } from './istanbul.ts';

const settle: FunctionSite = {
  name: "Function 'settle'",
  complexity: 2,
  start: { line: 1, column: 7 },
  bodyStart: { line: 1, column: 37 },
  end: { line: 4, column: 1 },
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

test('a statement inside a nested function counts for the nested function only', () => {
  const outer: FunctionSite = { ...settle, end: { line: 5, column: 1 } };
  const inner: FunctionSite = {
    name: 'Arrow function',
    complexity: 1,
    start: { line: 2, column: 15 },
    bodyStart: { line: 2, column: 22 },
    end: { line: 2, column: 40 },
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
