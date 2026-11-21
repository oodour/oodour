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
  return sites.flatMap((site) => {
    const { name, complexity, start } = site;

    const entries = coverage.functions.filter(({ line }) => line === start.line);

    if (entries.length === 0) {
      return [];
    }

    // The first line also holds whatever ran around the function, such as `export` when the module loaded.
    if (entries.every(({ count }) => count === 0)) {
      return [{ file, line: start.line, name, complexity, coverage: 0 }];
    }

    const nested = sites.filter((other) => other !== site && holdsLines(site, other));
    const own = coverage.lines.filter(
      ({ line }) => isOnLines(line, site) && !nested.some((inner) => isOnLines(line, inner)),
    );

    return [{ file, line: start.line, name, complexity, coverage: own.filter(({ count }) => count > 0).length / own.length }];
  });
}

/** Whether the function's lines take in every line of the other one, other than itself. */
function holdsLines(outer: FunctionSite, inner: FunctionSite): boolean {
  return isOnLines(inner.start.line, outer) && isOnLines(inner.end.line, outer) && inner.start.line > outer.start.line;
}

function isOnLines(line: number, { start, end }: FunctionSite): boolean {
  return line >= start.line && line <= end.line;
}
