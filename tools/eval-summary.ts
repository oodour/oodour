// Summarises a `claude plugin eval --json` result per case and arm: runs passed, mean score, each
// criterion's pass rate, how often the skill fired and how often its route reached the case's reference leaf (the
// with-only `skill-fired` and `leaf-read` graders), and Pass@k and Pass^k, which the tool does not report.
// Usage: node tools/eval-summary.ts <result.json>...

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export interface ArmSummary {
  readonly runs: number;
  readonly passed: number;
  // Runs that ended in an error (a usage limit, a crash): their zero score says nothing about the plugin.
  readonly errored: number;
  readonly meanScore: number;
  readonly criteria: Readonly<Record<string, number>>;
  readonly skillFired: number | undefined;
  // Runs whose skill route reached the reference leaf the case needs.
  readonly leafRead: number | undefined;
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
  readonly scored: boolean;
  readonly weight: number;
}

interface Run {
  readonly score: number;
  readonly passed: boolean;
  readonly errored: boolean;
  readonly graders: readonly Grader[];
}

// The chance that k runs drawn from n without replacement all come from the given `from` of them.
function drawnFrom(from: number, n: number, k: number): number {
  let result = 1;

  for (let i = 0; i < k; i++) {
    result *= (from - i) / (n - i);
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

  return 1 - drawnFrom(n - c, n, k);
}

export function passHatK(n: number, c: number, k: number): number {
  checkK(n, k);

  return drawnFrom(c, n, k);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expect(condition: boolean, field: string): asserts condition {
  if (!condition) {
    throw new Error(`not an eval result: ${field} is missing or has the wrong type`);
  }
}

// Each case's with-only graders: did the skill fire, and did its route reach the case's reference leaf. Under
// --ablation none the tool scores them like any criterion, so they are known by name.
const indicatorNames: readonly string[] = ['skill-fired', 'leaf-read'];

function isIndicator(grader: Grader): boolean {
  return indicatorNames.includes(grader.name);
}

function parseGrader(value: unknown, path: string): Grader {
  expect(isRecord(value), path);
  const { name, passed, withOnly, scored, weight } = value;
  expect(typeof name === 'string', `${path}.name`);
  expect(typeof passed === 'boolean', `${path}.passed`);

  return { name, passed, withOnly: withOnly === true, scored: scored === true, weight: typeof weight === 'number' ? weight : 1 };
}

// The tool's score is the weighted share of scored graders that passed; this one leaves the indicators out.
function scoreWithoutIndicators(graders: readonly Grader[]): number {
  const criteria = graders.filter((grader) => grader.scored && !isIndicator(grader));
  // Stryker disable next-line ArithmeticOperator: subtracting flips the sign of both sums, and their quotient stays the same
  const weightOf = (list: readonly Grader[]): number => list.reduce((sum, grader) => sum + grader.weight, 0);

  return weightOf(criteria.filter((grader) => grader.passed)) / weightOf(criteria);
}

function parseRun(value: unknown, path: string, threshold: number): Run {
  expect(isRecord(value), path);
  const { score, passed, error, graders } = value;
  expect(typeof score === 'number', `${path}.score`);
  expect(typeof passed === 'boolean', `${path}.passed`);
  expect(Array.isArray(graders), `${path}.graders`);
  const parsed = graders.map((grader, index) => parseGrader(grader, `${path}.graders[${String(index)}]`));
  const indicatorsScored = parsed.some((grader) => grader.scored && isIndicator(grader));
  const rescored = indicatorsScored ? scoreWithoutIndicators(parsed) : score;

  return {
    score: rescored,
    passed: indicatorsScored ? rescored >= threshold : passed,
    errored: error !== undefined && error !== null,
    graders: parsed,
  };
}

function rate(values: readonly boolean[]): number {
  return values.filter(Boolean).length / values.length;
}

function summariseArm(runs: readonly Run[]): ArmSummary {
  const all = runs.flatMap((run) => run.graders);
  const scored = all.filter((grader) => !grader.withOnly && !isIndicator(grader));
  const indicator = (name: string): number | undefined => {
    const results = all.filter((grader) => grader.name === name).map((grader) => grader.passed);

    return results.length > 0 ? rate(results) : undefined;
  };
  const names = [...new Set(scored.map((grader) => grader.name))];

  return {
    runs: runs.length,
    passed: runs.filter((run) => run.passed).length,
    errored: runs.filter((run) => run.errored).length,
    meanScore: runs.reduce((sum, run) => sum + run.score, 0) / runs.length,
    criteria: Object.fromEntries(
      names.map((name) => [name, rate(scored.filter((grader) => grader.name === name).map((grader) => grader.passed))]),
    ),
    skillFired: indicator('skill-fired'),
    leafRead: indicator('leaf-read'),
  };
}

function parseCase(value: unknown, path: string, threshold: number): CaseSummary {
  expect(isRecord(value), path);
  const { name, arms } = value;
  expect(typeof name === 'string', `${path}.name`);
  expect(isRecord(arms), `${path}.arms`);

  return {
    name,
    arms: Object.fromEntries(
      Object.entries(arms).map(([arm, runs]) => {
        expect(Array.isArray(runs), `${path}.arms.${arm}`);

        return [arm, summariseArm(runs.map((run, index) => parseRun(run, `${path}.arms.${arm}[${String(index)}]`, threshold)))];
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
  const { modelOverride, judgeModel, threshold } = suite;

  return {
    model: typeof modelOverride === 'string' ? modelOverride : undefined,
    judge: typeof judgeModel === 'string' ? judgeModel : undefined,
    costUsd,
    cases: cases.map((item, index) => parseCase(item, `cases[${String(index)}]`, typeof threshold === 'number' ? threshold : 1)),
  };
}

function percent(value: number | undefined): string {
  return value === undefined ? '-' : `${String(Math.round(value * 100))}%`;
}

function mean(values: readonly number[]): number | undefined {
  return values.length === 0 ? undefined : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function row(name: string, arm: string, counts: Pick<ArmSummary, 'runs' | 'passed' | 'errored'>, rates: readonly (number | undefined)[], weak: string): string {
  return `| ${name} | ${arm} | ${String(counts.runs)} | ${String(counts.passed)} | ${String(counts.errored)} | ${rates.map(percent).join(' | ')} | ${weak} |`;
}

export function formatReport(summary: Summary): string {
  const lines = [
    `Model ${summary.model ?? 'unknown'}, judge ${summary.judge ?? 'unknown'}, cost $${summary.costUsd.toFixed(2)}`,
    '',
    '| Case | Arm | Runs | Passed | Errored | Mean score | Pass@1 | Pass^n | Skill fired | Leaf read | Criteria below 100% |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const byArm = new Map<string, ArmSummary[]>();

  for (const item of summary.cases) {
    for (const [arm, stats] of Object.entries(item.arms)) {
      const ran = stats.runs > 0;
      const weak = Object.entries(stats.criteria)
        .filter(([, value]) => value < 1)
        .map(([name, value]) => `${name} ${percent(value)}`)
        .join(', ');

      byArm.set(arm, [...(byArm.get(arm) ?? []), stats]);
      lines.push(
        row(
          item.name,
          arm,
          stats,
          [
            ran ? stats.meanScore : undefined,
            ran ? passAtK(stats.runs, stats.passed, 1) : undefined,
            ran ? passHatK(stats.runs, stats.passed, stats.runs) : undefined,
            stats.skillFired,
            stats.leafRead,
          ],
          weak === '' ? '-' : weak,
        ),
      );
    }
  }

  for (const [arm, arms] of byArm) {
    const ran = arms.filter((stats) => stats.runs > 0);
    const total = (key: 'runs' | 'passed' | 'errored'): number => arms.reduce((sum, stats) => sum + stats[key], 0);
    const indicatorMean = (key: 'skillFired' | 'leafRead'): number | undefined =>
      mean(arms.flatMap((stats) => stats[key] ?? []));

    lines.push(
      row(
        'overall',
        arm,
        { runs: total('runs'), passed: total('passed'), errored: total('errored') },
        [
          mean(ran.map((stats) => stats.meanScore)),
          mean(ran.map((stats) => passAtK(stats.runs, stats.passed, 1))),
          mean(ran.map((stats) => passHatK(stats.runs, stats.passed, stats.runs))),
          indicatorMean('skillFired'),
          indicatorMean('leafRead'),
        ],
        '-',
      ),
    );
  }

  return lines.join('\n');
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === 'eval-summary.ts') {
  for (const file of process.argv.slice(2)) {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));

    console.log(`${formatReport(summarise(parsed))}\n`);
  }
}
