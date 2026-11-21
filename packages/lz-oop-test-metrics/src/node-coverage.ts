import type { MeasuredFunction } from './crap.ts';
import type { FunctionSite } from './functions.ts';

/** A line, or a function by the line it starts on, with how many times the tests ran it. */
interface Counted {
  readonly line: number;
  readonly count: number;
}

/** The parts of a file's `node:test` coverage the join reads: its functions and its lines. */
export interface NodeFileCoverage {
  readonly functions: readonly (Counted & { readonly name: string })[];
  readonly lines: readonly Counted[];
}

/**
 * Each function the coverage lists, with the share of its lines that ran. A function joins its coverage entry by the
 * line it starts on, the only position `node:test` gives a function.
 */
export function measuredFromNodeCoverage(
  file: string,
  sites: readonly FunctionSite[],
  coverage: NodeFileCoverage,
): MeasuredFunction[] {
  return sites.flatMap(({ name, complexity, start, end }) => {
    if (!coverage.functions.some(({ line }) => line === start.line)) {
      return [];
    }

    const own = coverage.lines.filter(({ line }) => line >= start.line && line <= end.line);

    return [{ file, line: start.line, name, complexity, coverage: own.filter(({ count }) => count > 0).length / own.length }];
  });
}
