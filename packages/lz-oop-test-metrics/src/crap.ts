/** One function's cyclomatic complexity and the fraction of it the tests ran, from 0 to 1. */
export interface FunctionMeasure {
  readonly complexity: number;
  readonly coverage: number;
}

/**
 * The function's CRAP score: its complexity, plus the square of its complexity times the cube of the share no test
 * ran. A fully tested function scores its complexity; an untested one its complexity squared plus its complexity.
 */
export function crapScore({ complexity, coverage }: FunctionMeasure): number {
  return complexity ** 2 * (1 - coverage) ** 3 + complexity;
}

/** A function the coverage names, where it starts, and its measure. */
export interface MeasuredFunction extends FunctionMeasure {
  readonly file: string;
  readonly line: number;
  readonly name: string;
  /** Whether any test ran it. */
  readonly called: boolean;
  /** Whether it is a method or accessor other objects may send. */
  readonly publicMethod: boolean;
  /** How many paths of its own branches no test took, as the coverage counts them. */
  readonly untestedBranches: number;
}

/** A measured function with its CRAP score. */
export interface CrapReport extends MeasuredFunction {
  readonly score: number;
}

/** One report as a stop-and-look line, led by the function's file and line so editors and terminals link to it. */
export function reportLine({ file, line, name, complexity, coverage, score }: CrapReport, limit: number): string {
  const where = `${file}:${String(line)}`;
  const rounded = String(Math.round(score * 10) / 10);
  const covered = String(Math.round(coverage * 100));

  return (
    `${where} Stop and look: Untested Code, ${name} scores CRAP ${rounded} (limit ${String(limit)}): ` +
    `${String(complexity)} paths, ${covered}% of it run by tests. Look for the paths ` +
    'no test takes. Cure: a test that drives each of them through the inputs, or fewer paths first (Decompose ' +
    'Conditional, Replace Conditional with Polymorphism) when those inputs are hard to set up.'
  );
}

/** The functions whose CRAP score reaches the limit, with their scores, in the order given. */
export function reportsAtLimit(functions: readonly MeasuredFunction[], limit: number): CrapReport[] {
  return functions
    .map((measured) => ({ ...measured, score: crapScore(measured) }))
    .filter(({ score }) => score >= limit);
}
