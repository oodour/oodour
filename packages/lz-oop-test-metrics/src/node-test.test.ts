import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestEvent } from 'node:test/reporters';
import { createTestMetricsReporter } from './node-test.ts';

const fixture = join(import.meta.dirname, '..', 'fixtures', 'node-test');
// A run started from inside `node --test` inherits NODE_TEST_CONTEXT and reports to its parent instead of running alone.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'NODE_TEST_CONTEXT'));
const testRun = [
  '--test',
  '--test-reporter=./reporter.ts',
  '--test-reporter-destination=stdout',
  '--test-coverage-include=src/order.ts',
  'src/order.test.ts',
];

/** Where `classify` starts and ends in the fixture's `src/order.ts`. */
const classifyLines = { first: 13, last: 23 };

/** The coverage of the fixture when no test called `classify`, its one listed function. */
function uncalledClassify(): TestEvent {
  const path = join(fixture, 'src', 'order.ts');
  const totals = {
    totalLineCount: 0,
    totalBranchCount: 0,
    totalFunctionCount: 1,
    coveredLineCount: 0,
    coveredBranchCount: 0,
    coveredFunctionCount: 0,
    coveredLinePercent: 0,
    coveredBranchPercent: 0,
    coveredFunctionPercent: 0,
  };

  return {
    type: 'test:coverage',
    data: {
      nesting: 0,
      summary: {
        workingDirectory: fixture,
        totals,
        thresholds: { line: 0, branch: 0, function: 0 },
        files: [
          {
            path,
            ...totals,
            functions: [{ name: 'classify', line: classifyLines.first, count: 0 }],
            branches: [],
            lines: Array.from({ length: classifyLines.last - classifyLines.first + 1 }, (_, index) => ({
              line: classifyLines.first + index,
              count: 0,
            })),
          },
        ],
      },
    },
  };
}

async function linesOf(reporter: ReturnType<typeof createTestMetricsReporter>): Promise<string[]> {
  const events: TestEvent[] = [{ type: 'test:diagnostic', data: { nesting: 0, message: 'tests 1', level: 'info' } }, uncalledClassify()];
  const lines: string[] = [];

  for await (const line of reporter(ReadableStream.from(events))) {
    lines.push(line);
  }

  return lines;
}

test('the reporter writes one line per finding from the coverage event and fails the run on a CRAP line', async () => {
  const before = process.exitCode;

  try {
    const lines = await linesOf(createTestMetricsReporter({ limit: 6 }));

    assert.deepEqual(
      { lines: lines.map((line) => /order\.ts:13 Stop and look: .+ scores CRAP 12 /u.test(line)), exitCode: process.exitCode },
      { lines: [true], exitCode: 1 },
    );
  } finally {
    process.exitCode = before;
  }
});

test('the reporter writes nothing and leaves the run passing when it finds nothing', async () => {
  const before = process.exitCode;
  const lines = await linesOf(createTestMetricsReporter());

  assert.deepEqual({ lines, exitCode: process.exitCode }, { lines: [], exitCode: before });
});

test('the same node:test run without coverage passes, so a failed run with coverage is the reporter failing it', () => {
  const run = spawnSync(process.execPath, testRun, { cwd: fixture, env, encoding: 'utf8' });

  assert.deepEqual({ reported: run.stdout.includes('Stop and look'), status: run.status }, { reported: false, status: 0 });
});

test('a node:test run with coverage reports each function at the CRAP limit and fails, and flags untested code', () => {
  const run = spawnSync(process.execPath, ['--experimental-test-coverage', ...testRun], {
    cwd: fixture,
    env,
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
        "src/order.ts:26 Stop and look: Untested Code, Method 'open' is public and no test called it. Look for what " +
          'sends it. Cure: a test that sends it and checks what it returns or the message it passes on, or delete it ' +
          'when nothing sends it.',
        "src/order.ts:30 Stop and look: Untested Code, Method 'charge' has 1 branch path no test took. Cure: a test " +
          'that drives it through the inputs that reach it.',
      ],
      status: 1,
    },
  );
});
