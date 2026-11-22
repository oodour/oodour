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
  publicMethod: false,
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
    branches: [],
  };

  assert.deepEqual(measuredFromNodeCoverage('src/order.ts', [settle], coverage), [
    {
      file: 'src/order.ts',
      line: 1,
      name: "Function 'settle'",
      complexity: 2,
      coverage: 0.75,
      called: true,
      publicMethod: false,
      untestedBranches: 0,
    },
  ]);
});

test('a called function counts each block on its lines that no test ran as an untested branch', () => {
  const coverage = {
    functions: [{ name: 'settle', line: 1, count: 1 }],
    lines: [1, 1, 0, 1].map((count, index) => ({ line: index + 1, count })),
    branches: [
      { line: 2, count: 1 },
      { line: 3, count: 0 },
    ],
  };

  assert.equal(measuredFromNodeCoverage('src/order.ts', [settle], coverage)[0]?.untestedBranches, 1);
});

test('a function the coverage lists no entry for is left out', () => {
  const coverage = { functions: [{ name: 'other', line: 9, count: 1 }], lines: [], branches: [] };

  assert.deepEqual(measuredFromNodeCoverage('src/order.ts', [settle], coverage), []);
});

test('a function counts only the lines from the one it starts on to the one it ends on', () => {
  const later: FunctionSite = { ...settle, start: { line: 3, column: 7 }, end: { line: 4, column: 1 } };
  const coverage = {
    functions: [{ name: 'settle', line: 3, count: 1 }],
    lines: [0, 0, 1, 1, 0, 0].map((count, index) => ({ line: index + 1, count })),
    branches: [],
  };

  assert.equal(measuredFromNodeCoverage('src/order.ts', [later], coverage)[0]?.coverage, 1);
});

test('a function joins only the coverage entries of the line it starts on', () => {
  const first: FunctionSite = { ...settle, end: { line: 2, column: 1 } };
  const second: FunctionSite = { ...settle, start: { line: 4, column: 7 }, end: { line: 5, column: 1 } };
  const coverage = {
    functions: [
      { name: 'settle', line: 1, count: 0 },
      { name: 'settle', line: 4, count: 1 },
    ],
    lines: [0, 0, 1, 1, 1].map((count, index) => ({ line: index + 1, count })),
    branches: [],
  };

  assert.deepEqual(
    measuredFromNodeCoverage('src/order.ts', [first, second], coverage).map(({ called }) => called),
    [false, true],
  );
});

test('a function on a line with more coverage entries than functions counts as called when any of them ran', () => {
  const coverage = {
    functions: [
      { name: '', line: 1, count: 0 },
      { name: 'settle', line: 1, count: 1 },
    ],
    lines: [1, 1, 1, 1].map((count, index) => ({ line: index + 1, count })),
    branches: [],
  };

  assert.equal(measuredFromNodeCoverage('src/order.ts', [settle], coverage)[0]?.called, true);
});

test('a function no test called is uncovered, though its first line ran when the module loaded', () => {
  const coverage = {
    functions: [{ name: 'settle', line: 1, count: 0 }],
    lines: [1, 0, 0, 0].map((count, index) => ({ line: index + 1, count })),
    branches: [],
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
    publicMethod: false,
  };
  const coverage = {
    functions: [
      { name: 'settle', line: 1, count: 1 },
      { name: 'pick', line: 2, count: 0 },
    ],
    lines: [1, 0, 0, 0, 1, 1].map((count, index) => ({ line: index + 1, count })),
    branches: [],
  };

  assert.deepEqual(
    measuredFromNodeCoverage('src/order.ts', [outer, inner], coverage).map(({ coverage: share }) => share),
    [1, 0],
  );
});

test('a block no test ran inside a nested function is untested for the nested function only', () => {
  const outer: FunctionSite = { ...settle, end: { line: 6, column: 1 } };
  const inner: FunctionSite = {
    name: 'Arrow function',
    complexity: 2,
    start: { line: 2, column: 15 },
    bodyStart: { line: 2, column: 21 },
    end: { line: 4, column: 3 },
    publicMethod: false,
  };
  const coverage = {
    functions: [
      { name: 'settle', line: 1, count: 1 },
      { name: 'pick', line: 2, count: 1 },
    ],
    lines: [1, 1, 0, 1, 1, 1].map((count, index) => ({ line: index + 1, count })),
    branches: [{ line: 3, count: 0 }],
  };

  assert.deepEqual(
    measuredFromNodeCoverage('src/order.ts', [outer, inner], coverage).map(({ untestedBranches }) => untestedBranches),
    [0, 1],
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
    publicMethod: false,
  };
  const callback: FunctionSite = {
    name: 'Arrow function',
    complexity: 2,
    start: { line: 1, column: 37 },
    bodyStart: { line: 1, column: 44 },
    end: { line: 1, column: 61 },
    publicMethod: false,
  };
  const coverage = {
    functions: [
      { name: 'signs', line: 1, count: 1 },
      { name: '', line: 1, count: 0 },
    ],
    lines: [{ line: 1, count: 1 }],
    branches: [],
  };

  assert.deepEqual(
    measuredFromNodeCoverage('src/order.ts', [callback, signs], coverage).map(({ coverage: share }) => share),
    [0, 1],
  );
});

test('functions that start on one line join its entries in source order, whatever starts on other lines', () => {
  const signs: FunctionSite = {
    name: 'Arrow function',
    complexity: 1,
    start: { line: 1, column: 21 },
    bodyStart: { line: 1, column: 29 },
    end: { line: 1, column: 62 },
    publicMethod: false,
  };
  const callback: FunctionSite = { ...signs, complexity: 2, start: { line: 1, column: 37 }, end: { line: 1, column: 61 } };
  const later: FunctionSite = { ...settle, start: { line: 3, column: 1 }, end: { line: 3, column: 20 } };
  const coverage = {
    functions: [
      { name: 'signs', line: 1, count: 1 },
      { name: '', line: 1, count: 0 },
      { name: 'later', line: 3, count: 1 },
    ],
    lines: [1, 1, 1].map((count, index) => ({ line: index + 1, count })),
    branches: [],
  };

  assert.deepEqual(
    measuredFromNodeCoverage('src/order.ts', [callback, signs, later], coverage).map(({ called }) => called),
    [false, true, true],
  );
});
