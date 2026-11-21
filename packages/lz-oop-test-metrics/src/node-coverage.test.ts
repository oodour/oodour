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
