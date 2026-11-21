import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';

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

test('the same node:test run without coverage passes, so a failed run with coverage is the reporter failing it', () => {
  const run = spawnSync(process.execPath, testRun, { cwd: fixture, env, encoding: 'utf8' });

  assert.deepEqual({ reported: run.stdout.includes('Stop and look'), status: run.status }, { reported: false, status: 0 });
});

test('a node:test run with coverage reports each function at the CRAP limit and fails, and passes the others', () => {
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
      ],
      status: 1,
    },
  );
});
