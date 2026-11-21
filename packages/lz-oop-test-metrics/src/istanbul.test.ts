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
