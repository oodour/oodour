// Summarises a `claude plugin eval --json` result per case and arm: runs passed, mean score, each
// criterion's pass rate, how often the skill fired, and Pass@k and Pass^k, which the tool does not report.
// Usage: node tools/eval-summary.ts <result.json>...

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export interface ArmSummary {
  readonly runs: number;
  readonly passed: number;
  readonly meanScore: number;
  readonly criteria: Readonly<Record<string, number>>;
  readonly skillFired: number | undefined;
}

export interface CaseSummary {
  readonly name: string;
  readonly arms: Readonly<Record<string, ArmSummary>>;
}

export interface Summary {
  readonly model: string | undefined;
  readonly judge: string | undefined;
  readonly costUsd: number;
  readonly cases: readonly CaseSummary[];
}

interface Grader {
  readonly name: string;
  readonly passed: boolean;
  readonly withOnly: boolean;
}

interface Run {
  readonly score: number;
  readonly passed: boolean;
  readonly graders: readonly Grader[];
}

function choose(n: number, k: number): number {
  let result = 1;

  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }

  return result;
}

function checkK(n: number, k: number): void {
  if (!Number.isInteger(k) || k < 1 || k > n) {
    throw new Error(`k must be between 1 and ${String(n)}, got ${String(k)}`);
  }
}

// Unbiased estimators over n runs of which c passed (Chen et al. 2021 for pass@k).
export function passAtK(n: number, c: number, k: number): number {
  checkK(n, k);

  return 1 - choose(n - c, k) / choose(n, k);
}

export function passHatK(n: number, c: number, k: number): number {
  checkK(n, k);

  return choose(c, k) / choose(n, k);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expect(condition: boolean, field: string): asserts condition {
  if (!condition) {
    throw new Error(`not an eval result: ${field} is missing or has the wrong type`);
  }
}

function parseGrader(value: unknown, path: string): Grader {
  expect(isRecord(value), path);
  const { name, passed, withOnly } = value;
  expect(typeof name === 'string', `${path}.name`);
  expect(typeof passed === 'boolean', `${path}.passed`);

  return { name, passed, withOnly: withOnly === true };
}

function parseRun(value: unknown, path: string): Run {
  expect(isRecord(value), path);
  const { score, passed, graders } = value;
  expect(typeof score === 'number', `${path}.score`);
  expect(typeof passed === 'boolean', `${path}.passed`);
  expect(Array.isArray(graders), `${path}.graders`);

  return { score, passed, graders: graders.map((grader, index) => parseGrader(grader, `${path}.graders[${String(index)}]`)) };
}

function rate(values: readonly boolean[]): number {
  return values.filter(Boolean).length / values.length;
}

function summariseArm(runs: readonly Run[]): ArmSummary {
  const all = runs.flatMap((run) => run.graders);
  const scored = all.filter((grader) => !grader.withOnly);
  const fired = all.filter((grader) => grader.withOnly).map((grader) => grader.passed);
  const names = [...new Set(scored.map((grader) => grader.name))];

  return {
    runs: runs.length,
    passed: runs.filter((run) => run.passed).length,
    meanScore: runs.reduce((sum, run) => sum + run.score, 0) / runs.length,
    criteria: Object.fromEntries(
      names.map((name) => [name, rate(scored.filter((grader) => grader.name === name).map((grader) => grader.passed))]),
    ),
    skillFired: fired.length > 0 ? rate(fired) : undefined,
  };
}

function parseCase(value: unknown, path: string): CaseSummary {
  expect(isRecord(value), path);
  const { name, arms } = value;
  expect(typeof name === 'string', `${path}.name`);
  expect(isRecord(arms), `${path}.arms`);

  return {
    name,
    arms: Object.fromEntries(
      Object.entries(arms).map(([arm, runs]) => {
        expect(Array.isArray(runs), `${path}.arms.${arm}`);

        return [arm, summariseArm(runs.map((run, index) => parseRun(run, `${path}.arms.${arm}[${String(index)}]`)))];
      }),
    ),
  };
}

export function summarise(result: unknown): Summary {
  expect(isRecord(result), 'result');
  const { suite, costUsd, cases } = result;
  expect(Array.isArray(cases), 'cases');
  expect(isRecord(suite), 'suite');
  expect(typeof costUsd === 'number', 'costUsd');
  const { modelOverride, judgeModel } = suite;

  return {
    model: typeof modelOverride === 'string' ? modelOverride : undefined,
    judge: typeof judgeModel === 'string' ? judgeModel : undefined,
    costUsd,
    cases: cases.map((item, index) => parseCase(item, `cases[${String(index)}]`)),
  };
}

function percent(value: number | undefined): string {
  return value === undefined ? '-' : `${String(Math.round(value * 100))}%`;
}

export function formatReport(summary: Summary): string {
  const lines = [
    `Model ${summary.model ?? 'unknown'}, judge ${summary.judge ?? 'unknown'}, cost $${summary.costUsd.toFixed(2)}`,
    '',
    '| Case | Arm | Runs | Passed | Mean score | Pass@1 | Pass^n | Skill fired | Criteria below 100% |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const item of summary.cases) {
    for (const [arm, stats] of Object.entries(item.arms)) {
      const weak = Object.entries(stats.criteria)
        .filter(([, value]) => value < 1)
        .map(([name, value]) => `${name} ${percent(value)}`)
        .join(', ');

      lines.push(
        `| ${item.name} | ${arm} | ${String(stats.runs)} | ${String(stats.passed)} | ${percent(stats.meanScore)} | ` +
          `${percent(passAtK(stats.runs, stats.passed, 1))} | ${percent(passHatK(stats.runs, stats.passed, stats.runs))} | ` +
          `${percent(stats.skillFired)} | ${weak === '' ? '-' : weak} |`,
      );
    }
  }

  return lines.join('\n');
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === 'eval-summary.ts') {
  for (const file of process.argv.slice(2)) {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));

    console.log(`${formatReport(summarise(parsed))}\n`);
  }
}
