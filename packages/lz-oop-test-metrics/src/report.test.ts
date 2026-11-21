import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reportLine, type MeasuredFunction } from './crap.ts';
import { testMetricsReport } from './report.ts';

const settle: MeasuredFunction = {
  file: 'src/order.ts',
  line: 3,
  name: "Method 'settle'",
  complexity: 5,
  coverage: 1,
  called: true,
  publicMethod: true,
  untestedBranches: 0,
};

test('a run that measured no function prints nothing and passes', () => {
  assert.deepEqual(testMetricsReport([]), { lines: [], failed: false });
});

test('a function whose CRAP score reaches the default limit of 30 gets its CRAP line and fails the run', () => {
  const risky = { ...settle, coverage: 0 };

  assert.deepEqual(testMetricsReport([risky]), {
    lines: [reportLine({ ...risky, score: 30 }, 30)],
    failed: true,
  });
});

test('a lower limit reports a function the default would pass, and names that limit', () => {
  const risky = { ...settle, coverage: 0.1 };
  const [line] = testMetricsReport([risky], { limit: 20 }).lines;

  assert.equal(line, reportLine({ ...risky, score: 23.225 }, 20));
});

test('a public method no test called gets a stop-and-look line of its own, and the run passes', () => {
  const unsent = { ...settle, complexity: 1, coverage: 0, called: false };

  assert.deepEqual(testMetricsReport([unsent]), {
    lines: [
      "src/order.ts:3 Stop and look: Untested Code, Method 'settle' is public and no test called it. Cure: a test " +
        'that sends it and checks its result, or delete it when nothing sends it.',
    ],
    failed: false,
  });
});

test('a called function with branch paths no test took gets a stop-and-look line that counts them, and passes', () => {
  const partial = { ...settle, untestedBranches: 2 };

  assert.deepEqual(testMetricsReport([partial]), {
    lines: [
      "src/order.ts:3 Stop and look: Untested Code, Method 'settle' has 2 branch paths no test took. Cure: a test " +
        'that drives each of them through the inputs that reach it.',
    ],
    failed: false,
  });
});

test("each function's lines come together, CRAP first, in the order the functions were measured", () => {
  const unsent = { ...settle, coverage: 0, called: false };
  const partial = { ...settle, line: 9, name: "Method 'total'", complexity: 6, coverage: 0.1, untestedBranches: 2 };
  const { lines } = testMetricsReport([unsent, partial]);

  assert.deepEqual(
    lines.map((line) => /^\S+ Stop and look: Untested Code, Method '(\w+)' (\w+)/.exec(line)?.slice(1).join(' ')),
    ['settle scores', 'settle is', 'total scores', 'total has'],
  );
});

test('with CRAP switched off, a function at the limit gets no CRAP line and the run passes', () => {
  const unsent = { ...settle, coverage: 0, called: false };
  const { lines, failed } = testMetricsReport([unsent], { crap: false });

  assert.deepEqual(
    { lines: lines.map((line) => line.includes('scores CRAP')), failed },
    { lines: [false], failed: false },
  );
});

test('with uncalled public methods switched off, a public method no test called gets no line', () => {
  const unsent = { ...settle, complexity: 1, coverage: 0, called: false };

  assert.deepEqual(testMetricsReport([unsent], { uncalledPublicMethods: false }).lines, []);
});

test('with untested branches switched off, a called function with untaken paths gets no line', () => {
  assert.deepEqual(testMetricsReport([{ ...settle, untestedBranches: 2 }], { untestedBranches: false }).lines, []);
});

test('one branch path no test took reads in the singular', () => {
  const [line] = testMetricsReport([{ ...settle, untestedBranches: 1 }]).lines;

  assert.equal(
    line,
    "src/order.ts:3 Stop and look: Untested Code, Method 'settle' has 1 branch path no test took. Cure: a test that " +
      'drives it through the inputs that reach it.',
  );
});

test('a function no test called gets no branch line, whatever its untaken paths', () => {
  const unrun = { ...settle, complexity: 1, coverage: 0, called: false, publicMethod: false, untestedBranches: 2 };

  assert.deepEqual(testMetricsReport([unrun]).lines, []);
});
