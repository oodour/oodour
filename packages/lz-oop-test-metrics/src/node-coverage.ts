import type { MeasuredFunction } from './crap.ts';
import type { FunctionSite } from './functions.ts';

/** A line, or a function by the line it starts on, with how many times the tests ran it. */
interface Counted {
  readonly line: number;
  readonly count: number;
}

/**
 * The parts of a file's `node:test` coverage the join reads: its functions, its lines and its branches. A branch is a
 * block that ran a different number of times than the block around it, by the line it starts on.
 */
export interface NodeFileCoverage {
  readonly functions: readonly (Counted & { readonly name: string })[];
  readonly lines: readonly Counted[];
  readonly branches: readonly Counted[];
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
    const { name, complexity, start, publicMethod } = site;

    const entries = entriesFor(site, sites, coverage.functions);

    if (entries.length === 0) {
      return [];
    }

    const called = entries.some(({ count }) => count > 0);
    const nested = sites.filter((other) => other !== site && holdsLines(site, other));
    const isOwn = ({ line }: Counted) => isOnLines(line, site) && !nested.some((inner) => isOnLines(line, inner));
    const untestedBranches = coverage.branches.filter((branch) => branch.count === 0 && isOwn(branch)).length;
    const measured = { file, line: start.line, name, complexity, called, publicMethod, untestedBranches };

    // The first line also holds whatever ran around the function, such as `export` when the module loaded.
    if (!called) {
      return [{ ...measured, coverage: 0 }];
    }

    const own = coverage.lines.filter(isOwn);

    return [{ ...measured, coverage: own.filter(({ count }) => count > 0).length / own.length }];
  });
}

/**
 * The coverage entries on the line the function starts on. `node:test` lists the functions of one line in source order
 * and gives no column, so when the line holds as many functions as entries, each function takes the entry in its place;
 * otherwise it takes them all.
 */
function entriesFor(site: FunctionSite, sites: readonly FunctionSite[], functions: NodeFileCoverage['functions']) {
  const onLine = functions.filter(({ line }) => line === site.start.line);
  const neighbours = sites
    .filter(({ start }) => start.line === site.start.line)
    .toSorted((first, second) => first.start.column - second.start.column);
  const entry = neighbours.length === onLine.length ? onLine[neighbours.indexOf(site)] : undefined;

  return entry === undefined ? onLine : [entry];
}

/** Whether the function's lines take in every line of the other one, other than itself. */
function holdsLines(outer: FunctionSite, inner: FunctionSite): boolean {
  return isOnLines(inner.start.line, outer) && isOnLines(inner.end.line, outer) && inner.start.line > outer.start.line;
}

function isOnLines(line: number, { start, end }: FunctionSite): boolean {
  return line >= start.line && line <= end.line;
}
