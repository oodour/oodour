import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { functionsIn } from './functions.ts';
import { TestMetricsReporter } from './vitest.ts';

const fixture = join(import.meta.dirname, '..', 'fixtures', 'vitest');
const vitest = join(import.meta.dirname, '..', '..', '..', 'node_modules', 'vitest', 'vitest.mjs');

/** The fixture's coverage when no test called `classify`, its one listed function. */
function uncalledClassify() {
  const path = join(fixture, 'src', 'order.ts');
  const classify = functionsIn(path, readFileSync(path, 'utf8')).find(({ name }) => name === "Function 'classify'");

  if (classify === undefined) {
    throw new Error("The fixture lost its function 'classify'.");
  }

  const loc = { start: classify.bodyStart, end: classify.end };
  const file = { fnMap: { '0': { name: 'classify', loc } }, f: { '0': 0 }, statementMap: {}, s: {}, branchMap: {}, b: {} };

  return { [path]: file };
}

test('the reporter prints one line per finding and fails the run when a CRAP line is among them', (t) => {
  const log = t.mock.method(console, 'log', () => undefined);
  const before = process.exitCode;

  try {
    new TestMetricsReporter({ limit: 6 }).onCoverage(uncalledClassify());

    assert.deepEqual(
      { printed: log.mock.calls.map(({ arguments: [text] }) => String(text).split('\n').length), exitCode: process.exitCode },
      { printed: [1], exitCode: 1 },
    );
  } finally {
    process.exitCode = before;
  }
});

test('the reporter prints nothing and leaves the run passing when it finds nothing', (t) => {
  const log = t.mock.method(console, 'log', () => undefined);
  const before = process.exitCode;

  new TestMetricsReporter().onCoverage(uncalledClassify());

  assert.deepEqual({ printed: log.mock.callCount(), exitCode: process.exitCode }, { printed: 0, exitCode: before });
});

test('the same Vitest run without coverage passes, so a failed run with coverage is the reporter failing it', () => {
  const run = spawnSync(process.execPath, [vitest, 'run', '--coverage.enabled=false'], {
    cwd: fixture,
    encoding: 'utf8',
  });

  assert.deepEqual({ reported: run.stdout.includes('Stop and look'), status: run.status }, { reported: false, status: 0 });
});

for (const provider of ['v8', 'istanbul']) {
  test(`a Vitest run with ${provider} coverage reports each function at the CRAP limit and fails, and flags untested code`, () => {
    const run = spawnSync(process.execPath, [vitest, 'run', `--coverage.provider=${provider}`], {
      cwd: fixture,
      encoding: 'utf8',
    });
    const reports = run.stdout.split(/\r?\n/u).filter((line) => line.includes('Stop and look'));

    assert.deepEqual(
      { reports, status: run.status },
      {
        reports: [
          "src/order.ts:13 Stop and look: Untested Code, Function 'classify' scores CRAP 12 (limit 6): 3 paths, 0% of " +
            'it run by tests. Look for the paths no test takes. Cure: a test that drives each of them through the ' +
            'inputs, or fewer paths first (Decompose Conditional, Replace Conditional with Polymorphism) when those ' +
            'inputs are hard to set up.',
          "src/order.ts:26 Stop and look: Untested Code, Method 'open' is public and no test called it. Cure: a test " +
            'that sends it and checks what it returns or the message it passes on, or delete it when nothing sends ' +
            'it.',
          "src/order.ts:30 Stop and look: Untested Code, Method 'charge' has 1 branch path no test took. Cure: a " +
            'test that drives it through the inputs that reach it.',
        ],
        status: 1,
      },
    );
  });
}
