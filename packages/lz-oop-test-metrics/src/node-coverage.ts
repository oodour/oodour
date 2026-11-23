import type { MeasuredFunction } from './crap.ts';
import { nestedIn, type FunctionSite } from './functions.ts';

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

/** V8's entries for a class's field initializers and static members: one each for the whole class, on its first one. */
const memberInitializers = new Set(['<instance_members_initializer>', '<static_initializer>']);

/**
 * Each function the coverage lists, with the share of its lines that ran. A function joins its coverage entry by the
 * line it starts on, the only position `node:test` gives a function.
 */
export function measuredFromNodeCoverage(
  file: string,
  sites: readonly FunctionSite[],
  coverage: NodeFileCoverage,
): MeasuredFunction[] {
  const calledSites = new Set(
    sites.filter((site) => entriesFor(site, sites, coverage.functions).some(({ count }) => count > 0)),
  );
  // `node:test` drops the lines a `node:coverage ignore` comment covers from the coverage, but keeps the blocks on them.
  const listedLines = new Set(coverage.lines.map(({ line }) => line));
  const untakenBlocks = coverage.branches.filter(({ line, count }) => count === 0 && listedLines.has(line));

  return sites.flatMap((site) => {
    const { name, complexity, start, publicMethod } = site;
    const ignored = !coverage.lines.some(({ line }) => isOnLines(line, site));

    if (entriesFor(site, sites, coverage.functions).length === 0 || ignored) {
      return [];
    }

    const called = calledSites.has(site);
    const measured = { file, line: start.line, name, complexity, called, publicMethod };

    // The first line also holds whatever ran around the function, such as `export` when the module loaded. V8 lists no
    // blocks for a function that never ran.
    if (!called) {
      return [{ ...measured, coverage: 0, untestedBranches: 0 }];
    }

    const nested = nestedIn(site, sites);
    const own = coverage.lines.filter(({ line }) => ownsLine(site, nested, line));
    // With its first line left out of the coverage, a function whose other lines are all a function inside it has no
    // line of its own, so a call covers it.
    const share = own.length > 0 ? own.filter(({ count }) => count > 0).length / own.length : 1;
    // The blocks on the lines of a function that never ran belong to the called function around it.
    const calledNested = nested.filter((inner) => calledSites.has(inner));
    const untestedBranches = untakenBlocks.filter(({ line }) => ownsLine(site, calledNested, line)).length;

    return [{ ...measured, coverage: share, untestedBranches }];
  });
}

/**
 * The coverage entries on the line the function starts on. `node:test` lists the functions of one line in source order
 * and gives no column, so when the line holds as many functions as entries, each function takes the entry in its place;
 * otherwise it takes them all.
 */
function entriesFor(site: FunctionSite, sites: readonly FunctionSite[], functions: NodeFileCoverage['functions']) {
  const onLine = functions.filter(({ line, name }) => line === site.start.line && !memberInitializers.has(name));
  const neighbours = sites
    .filter(({ start }) => start.line === site.start.line)
    .toSorted((first, second) => first.start.column - second.start.column);
  const entry = neighbours.length === onLine.length ? onLine[neighbours.indexOf(site)] : undefined;

  return entry === undefined ? onLine : [entry];
}

/**
 * Whether a line is the function's own rather than a line of a function inside it. A line holds no columns, so the
 * first line stays the function's own when a function inside it starts there too.
 */
function ownsLine(site: FunctionSite, inners: readonly FunctionSite[], line: number): boolean {
  return isOnLines(line, site) && (line === site.start.line || !inners.some((inner) => isOnLines(line, inner)));
}

function isOnLines(line: number, { start, end }: FunctionSite): boolean {
  return line >= start.line && line <= end.line;
}
