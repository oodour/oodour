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

/** The functions whose CRAP score reaches the limit, with their scores, in the order given. */
export function reportsAtLimit(functions: readonly MeasuredFunction[], limit: number): CrapReport[] {
  return functions
    .map((measured) => ({ ...measured, score: crapScore(measured) }))
    .filter(({ score }) => score >= limit);
}
