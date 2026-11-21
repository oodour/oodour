import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FunctionSite } from './functions.ts';
import { measuredFromNodeCoverage } from './node-coverage.ts';

const settle: FunctionSite = {
  name: "Function 'settle'",
  complexity: 2,
  start: { line: 1, column: 7 },
  bodyStart: { line: 1, column: 37 },
  end: { line: 4, column: 1 },
};

test("a function's coverage is the share of its lines that ran, joined to it by the line it starts on", () => {
  const coverage = {
    functions: [{ name: 'settle', line: 1, count: 1 }],
    lines: [
      { line: 1, count: 1 },
      { line: 2, count: 1 },
      { line: 3, count: 0 },
      { line: 4, count: 1 },
    ],
  };

  assert.deepEqual(measuredFromNodeCoverage('src/order.ts', [settle], coverage), [
    { file: 'src/order.ts', line: 1, name: "Function 'settle'", complexity: 2, coverage: 0.75 },
  ]);
});

test('a function no test called is uncovered, though its first line ran when the module loaded', () => {
  const coverage = {
    functions: [{ name: 'settle', line: 1, count: 0 }],
    lines: [1, 0, 0, 0].map((count, index) => ({ line: index + 1, count })),
  };

  assert.equal(measuredFromNodeCoverage('src/order.ts', [settle], coverage)[0]?.coverage, 0);
});

test('the lines of a nested function count for the nested function only', () => {
  const outer: FunctionSite = { ...settle, end: { line: 6, column: 1 } };
  const inner: FunctionSite = {
    name: 'Arrow function',
    complexity: 1,
    start: { line: 2, column: 15 },
    bodyStart: { line: 2, column: 21 },
    end: { line: 4, column: 3 },
  };
  const coverage = {
    functions: [
      { name: 'settle', line: 1, count: 1 },
      { name: 'pick', line: 2, count: 0 },
    ],
    lines: [1, 0, 0, 0, 1, 1].map((count, index) => ({ line: index + 1, count })),
  };

  assert.deepEqual(
    measuredFromNodeCoverage('src/order.ts', [outer, inner], coverage).map(({ coverage: share }) => share),
    [1, 0],
  );
});

test('functions that start on one line join the entries of that line in source order', () => {
  // export const signs = (xs) => xs.map((x) => (x > 0 ? 1 : -1));
  const signs: FunctionSite = {
    name: 'Arrow function',
    complexity: 1,
    start: { line: 1, column: 21 },
    bodyStart: { line: 1, column: 29 },
    end: { line: 1, column: 62 },
  };
  const callback: FunctionSite = {
    name: 'Arrow function',
    complexity: 2,
    start: { line: 1, column: 37 },
    bodyStart: { line: 1, column: 44 },
    end: { line: 1, column: 61 },
  };
  const coverage = {
    functions: [
      { name: 'signs', line: 1, count: 1 },
      { name: '', line: 1, count: 0 },
    ],
    lines: [{ line: 1, count: 1 }],
  };

  assert.deepEqual(
    measuredFromNodeCoverage('src/order.ts', [callback, signs], coverage).map(({ coverage: share }) => share),
    [0, 1],
  );
});
