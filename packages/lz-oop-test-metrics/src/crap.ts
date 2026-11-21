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
