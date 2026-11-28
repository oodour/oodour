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
    fnMap: {
      '0': {
        name: 'settle',
        loc: { start: { line: 1, column: 37 }, end: { line: 4, column: 1 } },
      },
    },
    f: { '0': 1 },
    statementMap: {
      '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 31 } },
      '1': { start: { line: 3, column: 2 }, end: { line: 3, column: 21 } },
    },
    s: { '0': 1, '1': 0 },
    branchMap: {},
    b: {},
  };

  assert.deepEqual(measuredFromIstanbul('src/order.ts', [settle], coverage), [
    {
      file: 'src/order.ts',
      line: 1,
      name: "Function 'settle'",
      complexity: 2,
      coverage: 0.5,
      called: true,
      publicMethod: false,
      untestedBranches: 0,
    },
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
    fnMap: {
      '0': {
        name: 'reset',
        loc: { start: { line: 2, column: 10 }, end: { line: 2, column: 12 } },
      },
    },
    f: { '0': calls },
    statementMap: {},
    s: {},
    branchMap: {},
    b: {},
  });

  assert.deepEqual(
    [1, 0].map(
      (calls) =>
        measuredFromIstanbul(
          'src/cart.ts',
          [noop],
          coverageWhenCalled(calls),
        )[0]?.coverage,
    ),
    [1, 0],
  );
});

test('a called function whose one statement never ran is uncovered', () => {
  const coverage = {
    fnMap: {
      '0': {
        name: 'settle',
        loc: { start: { line: 1, column: 37 }, end: { line: 4, column: 1 } },
      },
    },
    f: { '0': 1 },
    statementMap: {
      '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 31 } },
    },
    s: { '0': 0 },
    branchMap: {},
    b: {},
  };

  assert.equal(
    measuredFromIstanbul('src/order.ts', [settle], coverage)[0]?.coverage,
    0,
  );
});

test('a function or statement the coverage gives no hit count counts as not run', () => {
  const coverage = {
    fnMap: {
      '0': {
        name: 'settle',
        loc: { start: { line: 1, column: 37 }, end: { line: 4, column: 1 } },
      },
    },
    f: {},
    statementMap: {
      '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 31 } },
      '1': { start: { line: 3, column: 2 }, end: { line: 3, column: 21 } },
    },
    s: { '0': 1 },
    branchMap: {},
    b: {},
  };

  const [measured] = measuredFromIstanbul('src/order.ts', [settle], coverage);

  assert.deepEqual([measured?.called, measured?.coverage], [false, 0.5]);
});

test('a function joins the coverage entry that starts exactly where its body starts, by line and column', () => {
  const coverage = {
    fnMap: {
      '0': {
        name: 'other',
        loc: { start: { line: 1, column: 10 }, end: { line: 1, column: 20 } },
      },
      '1': {
        name: 'later',
        loc: { start: { line: 5, column: 37 }, end: { line: 6, column: 1 } },
      },
    },
    f: { '0': 1, '1': 1 },
    statementMap: {},
    s: {},
    branchMap: {},
    b: {},
  };

  assert.deepEqual(
    measuredFromIstanbul('src/order.ts', [settle], coverage),
    [],
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
    statementMap: {
      '0': { start: { line: 2, column: 10 }, end: { line: 2, column: 39 } },
    },
    s: { '0': 0 },
    branchMap: {},
    b: {},
  };

  assert.deepEqual(
    measuredFromIstanbul('src/cart.ts', [initializer], coverage),
    [],
  );
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
      '0': {
        name: 'settle',
        loc: { start: { line: 1, column: 37 }, end: { line: 5, column: 1 } },
      },
      '1': {
        name: 'pick',
        loc: { start: { line: 2, column: 22 }, end: { line: 2, column: 40 } },
      },
    },
    f: { '0': 1, '1': 0 },
    statementMap: {
      '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 41 } },
      '1': { start: { line: 2, column: 22 }, end: { line: 2, column: 40 } },
      '2': { start: { line: 3, column: 2 }, end: { line: 3, column: 20 } },
    },
    s: { '0': 1, '1': 0, '2': 1 },
    branchMap: {},
    b: {},
  };

  assert.deepEqual(
    measuredFromIstanbul('src/order.ts', [outer, inner], coverage).map(
      ({ coverage: share }) => share,
    ),
    [1, 0],
  );
});

test('a function counts the paths of its own branches no test took, and says whether a test called it', () => {
  const outer: FunctionSite = {
    ...settle,
    end: { line: 6, column: 1 },
    publicMethod: true,
  };
  const inner: FunctionSite = {
    name: 'Arrow function',
    complexity: 2,
    start: { line: 4, column: 15 },
    bodyStart: { line: 4, column: 22 },
    end: { line: 4, column: 50 },
    publicMethod: false,
  };
  const coverage = {
    fnMap: {
      '0': {
        name: 'settle',
        loc: { start: { line: 1, column: 37 }, end: { line: 6, column: 1 } },
      },
      '1': {
        name: 'pick',
        loc: { start: { line: 4, column: 22 }, end: { line: 4, column: 50 } },
      },
    },
    f: { '0': 2, '1': 0 },
    statementMap: {
      '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 31 } },
    },
    s: { '0': 2 },
    branchMap: {
      '0': { loc: { start: { line: 2, column: 2 } } },
      '1': { loc: { start: { line: 3, column: 9 } } },
      '2': { loc: { start: { line: 4, column: 22 } } },
    },
    b: { '0': [2, 0], '1': [0, 0, 2], '2': [0, 0] },
  };

  assert.deepEqual(
    measuredFromIstanbul('src/order.ts', [outer, inner], coverage).map(
      ({ called, publicMethod, untestedBranches }) => ({
        called,
        publicMethod,
        untestedBranches,
      }),
    ),
    [
      { called: true, publicMethod: true, untestedBranches: 3 },
      { called: false, publicMethod: false, untestedBranches: 2 },
    ],
  );
});

test("Vitest's coverage map gives each file's coverage by its path, read through the map's own JSON form", () => {
  const order = {
    path: 'D:/app/src/order.ts',
    fnMap: {
      '0': {
        name: 'settle',
        loc: { start: { line: 1, column: 37 }, end: { line: 4, column: 1 } },
      },
    },
    f: { '0': 1 },
    statementMap: {
      '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 31 } },
    },
    s: { '0': 1 },
    branchMap: {
      '0': {
        loc: { start: { line: 2, column: 2 }, end: { line: 2, column: null } },
      },
    },
    b: { '0': [1, 0] },
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

  assert.throws(
    () => parseCoverageMap({ 'D:/app/src/order.ts': statementWithoutEnd }),
    /D:\/app\/src\/order\.ts/u,
  );
  assert.throws(() => parseCoverageMap([]), /not an object of files/u);
});

test('a file coverage missing a field the join reads, or holding one of the wrong type, stops the reporter', () => {
  const statement = {
    start: { line: 2, column: 2 },
    end: { line: 2, column: 31 },
  };
  const valid = {
    fnMap: {
      '0': {
        name: 'settle',
        loc: { start: { line: 1, column: 37 }, end: { line: 4, column: 1 } },
      },
    },
    f: { '0': 1 },
    statementMap: { '0': statement },
    s: { '0': 1 },
    branchMap: { '0': { loc: { start: { line: 2, column: 2 } } } },
    b: { '0': [1, 0] },
  };
  const broken = [
    null,
    { ...valid, fnMap: { '0': { loc: valid.fnMap['0'].loc } } },
    { ...valid, branchMap: { '0': { loc: {} } } },
    { ...valid, b: { '0': [1, 'none'] } },
    {
      ...valid,
      statementMap: { '0': { ...statement, start: { line: '2', column: 2 } } },
    },
    {
      ...valid,
      statementMap: { '0': statement, '1': { start: statement.start } },
    },
  ];

  assert.deepEqual(
    [...parseCoverageMap({ 'src/order.ts': valid })],
    [['src/order.ts', valid]],
  );

  for (const file of broken) {
    assert.throws(
      () => parseCoverageMap({ 'src/order.ts': file }),
      /The coverage of src\/order\.ts is not/u,
    );
  }
});

test('a coverage map with a toJSON entry that is not a function is read as a plain object of files', () => {
  assert.throws(
    () => parseCoverageMap({ toJSON: 'src/order.ts' }),
    /The coverage of toJSON is not/u,
  );
});
