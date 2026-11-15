import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { formatReport, passAtK, passHatK, summarise } from './eval-summary.ts';

test('pass@k is the chance that at least one of k drawn runs passed', () => {
  assert.equal(passAtK(3, 0, 1), 0);
  assert.equal(passAtK(3, 3, 1), 1);
  assert.ok(Math.abs(passAtK(3, 1, 1) - 1 / 3) < 1e-12);
  assert.ok(Math.abs(passAtK(5, 2, 3) - 0.9) < 1e-12);
  assert.equal(passAtK(3, 1, 3), 1);
});

test('pass^k is the chance that all k drawn runs passed', () => {
  assert.equal(passHatK(3, 3, 3), 1);
  assert.equal(passHatK(3, 2, 3), 0);
  assert.ok(Math.abs(passHatK(3, 2, 1) - 2 / 3) < 1e-12);
  assert.ok(Math.abs(passHatK(5, 3, 2) - 0.3) < 1e-12);
});

test('k above the run count is refused', () => {
  assert.throws(() => passAtK(3, 1, 4), /k must be between 1 and 3/);
  assert.throws(() => passHatK(3, 1, 0), /k must be between 1 and 3/);
});

const grader = (name: string, passed: boolean, withOnly = false) => ({ name, passed, withOnly, scored: !withOnly, weight: 1 });

const result = {
  suite: { modelOverride: 'claude-opus-5-5', judgeModel: 'claude-sonnet-5-5' },
  costUsd: 1.5,
  cases: [
    {
      name: 'case-a',
      arms: {
        with: [
          { score: 1, passed: true, graders: [grader('c1', true), grader('c2', true), grader('skill-fired', true, true)] },
          { score: 0.5, passed: false, graders: [grader('c1', true), grader('c2', false), grader('skill-fired', false, true)] },
        ],
        without: [
          { score: 0.5, passed: false, graders: [grader('c1', false), grader('c2', true)] },
          { score: 0, passed: false, graders: [grader('c1', false), grader('c2', false)] },
        ],
      },
    },
  ],
};

test('a summary gives each arm its score, passes, criterion rates and how often the skill fired', () => {
  const summary = summarise(result);

  assert.equal(summary.model, 'claude-opus-5-5');
  assert.equal(summary.judge, 'claude-sonnet-5-5');
  assert.equal(summary.costUsd, 1.5);
  assert.deepEqual(summary.cases, [
    {
      name: 'case-a',
      arms: {
        with: { runs: 2, passed: 1, errored: 0, meanScore: 0.75, criteria: { c1: 1, c2: 0.5 }, skillFired: 0.5 },
        without: { runs: 2, passed: 0, errored: 0, meanScore: 0.25, criteria: { c1: 0, c2: 0.5 }, skillFired: undefined },
      },
    },
  ]);
});

test('the report gives a row per case and arm with Pass@1, Pass^n and the criteria below 100%', () => {
  const report = formatReport(summarise(result));

  assert.match(report, /^Model claude-opus-5-5, judge claude-sonnet-5-5, cost \$1\.50$/m);
  assert.match(report, /^\| case-a \| with \| 2 \| 1 \| 0 \| 75% \| 50% \| 0% \| 50% \| c2 50% \|$/m);
  assert.match(report, /^\| case-a \| without \| 2 \| 0 \| 0 \| 25% \| 0% \| 0% \| - \| c1 0%, c2 50% \|$/m);
});

test('a run that ended in an error is counted, so a zero score is not read as a failed criterion', () => {
  const errored = {
    suite: {},
    costUsd: 0,
    cases: [{ name: 'x', arms: { with: [{ score: 0, passed: false, error: { message: 'limit' }, graders: [] }, { score: 1, passed: true, error: null, graders: [] }] } }],
  };

  assert.equal(summarise(errored).cases[0]?.arms['with']?.errored, 1);
  assert.match(formatReport(summarise(errored)), /^\| x \| with \| 2 \| 1 \| 1 \|/m);
});

test('an arm with no runs is reported with dashes instead of failing the whole report', () => {
  const empty = { suite: {}, costUsd: 0, cases: [{ name: 'x', arms: { with: [] } }] };

  assert.match(formatReport(summarise(empty)), /^\| x \| with \| 0 \| 0 \| 0 \| - \| - \| - \| - \| - \|$/m);
});

test('the report ends with an overall row per arm: runs, passes, errors and the mean Pass@1 and Pass^n over cases', () => {
  const report = formatReport(summarise(result));

  assert.match(report, /^\| overall \| with \| 2 \| 1 \| 0 \| 75% \| 50% \| 0% \| 50% \| - \|$/m);
  assert.match(report, /^\| overall \| without \| 2 \| 0 \| 0 \| 25% \| 0% \| 0% \| - \| - \|$/m);
});

test('a result that is not an eval result is refused with the field that is wrong', () => {
  assert.throws(() => summarise({ cases: 'nope' }), /cases/);
  assert.throws(() => summarise({ suite: {}, costUsd: 0, cases: [{ name: 'x', arms: { with: [{ score: 'high' }] } }] }), /score/);
});

test('each refusal names the full path of the field that is wrong', () => {
  const refused = (value: unknown, field: string): void => {
    assert.throws(() => summarise(value), { message: `not an eval result: ${field} is missing or has the wrong type` });
  };
  const withRuns = (runs: unknown): unknown => ({ suite: {}, costUsd: 0, cases: [{ name: 'x', arms: { with: runs } }] });

  refused(null, 'result');
  refused('text', 'result');
  refused({ cases: [] }, 'suite');
  refused({ cases: [], suite: {} }, 'costUsd');
  refused({ suite: {}, costUsd: 0, cases: [{ arms: {} }] }, 'cases[0].name');
  refused(withRuns('nope'), 'cases[0].arms.with');
  refused({ suite: {}, costUsd: 0, cases: [{ name: 'x', arms: [] }] }, 'cases[0].arms');
  refused(withRuns([{ score: 1 }]), 'cases[0].arms.with[0].passed');
  refused(withRuns([{ score: 1, passed: true }]), 'cases[0].arms.with[0].graders');
  refused(withRuns([{ score: 1, passed: true, graders: [{ passed: true }] }]), 'cases[0].arms.with[0].graders[0].name');
  refused(withRuns([{ score: 1, passed: true, graders: [{ name: 'c1' }] }]), 'cases[0].arms.with[0].graders[0].passed');
});

test('a run counts as errored only when its error is set', () => {
  const arm = (error: unknown) => summarise({ suite: {}, costUsd: 0, cases: [{ name: 'x', arms: { with: [{ score: 0, passed: false, error, graders: [] }] } }] }).cases[0]?.arms['with']?.errored;

  assert.equal(arm({ message: 'limit' }), 1);
  assert.equal(arm(null), 0);
});

test('the report opens with the model line, a blank line and the table header', () => {
  const lines = formatReport(summarise({ suite: {}, costUsd: 0, cases: [] })).split('\n');

  assert.deepEqual(lines.slice(0, 4), [
    'Model unknown, judge unknown, cost $0.00',
    '',
    '| Case | Arm | Runs | Passed | Errored | Mean score | Pass@1 | Pass^n | Skill fired | Criteria below 100% |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]);
});

test('the overall row averages the case means over the cases that ran', () => {
  const twoCases = {
    suite: {},
    costUsd: 0,
    cases: [
      { name: 'a', arms: { with: [{ score: 1, passed: true, graders: [] }] } },
      { name: 'b', arms: { with: [{ score: 0, passed: false, graders: [] }] } },
    ],
  };

  assert.match(formatReport(summarise(twoCases)), /^\| overall \| with \| 2 \| 1 \| 0 \| 50% \| 50% \| 50% \| - \| - \|$/m);
});

test('importing the module runs no command, whatever the arguments', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'eval-summary-')), 'result.json');
  writeFileSync(file, JSON.stringify(result));
  const module = pathToFileURL(join(import.meta.dirname, 'eval-summary.ts')).href;

  const run = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(module)});`, 'first', file], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.equal(run.stdout, '');
});

test('run as a command, it prints the report of each file it is given, then a blank line', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'eval-summary-')), 'result.json');
  writeFileSync(file, JSON.stringify(result));

  const run = spawnSync(process.execPath, [join(import.meta.dirname, 'eval-summary.ts'), file], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.equal(run.stdout, `${formatReport(summarise(result))}\n\n`);
});
