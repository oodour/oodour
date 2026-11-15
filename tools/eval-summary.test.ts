import assert from 'node:assert/strict';
import { test } from 'node:test';
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
        with: { runs: 2, passed: 1, meanScore: 0.75, criteria: { c1: 1, c2: 0.5 }, skillFired: 0.5 },
        without: { runs: 2, passed: 0, meanScore: 0.25, criteria: { c1: 0, c2: 0.5 }, skillFired: undefined },
      },
    },
  ]);
});

test('the report gives a row per case and arm with Pass@1, Pass^n and the criteria below 100%', () => {
  const report = formatReport(summarise(result));

  assert.match(report, /^Model claude-opus-5-5, judge claude-sonnet-5-5, cost \$1\.50$/m);
  assert.match(report, /^\| case-a \| with \| 2 \| 1 \| 75% \| 50% \| 0% \| 50% \| c2 50% \|$/m);
  assert.match(report, /^\| case-a \| without \| 2 \| 0 \| 25% \| 0% \| 0% \| - \| c1 0%, c2 50% \|$/m);
});

test('a result that is not an eval result is refused with the field that is wrong', () => {
  assert.throws(() => summarise({ cases: 'nope' }), /cases/);
  assert.throws(() => summarise({ suite: {}, costUsd: 0, cases: [{ name: 'x', arms: { with: [{ score: 'high' }] } }] }), /score/);
});
