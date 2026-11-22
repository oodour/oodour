import type { MeasuredFunction } from './crap.ts';
import { isBefore, type FunctionSite, type Position } from './functions.ts';

/** A stretch of source, from its first character to just past its last. */
export interface Range {
  readonly start: Position;
  readonly end: Position;
}

/**
 * The parts of an Istanbul file coverage the join reads: functions and statements, each with its hit count, and
 * branches, each with a hit count per path.
 */
export interface IstanbulFileCoverage {
  readonly fnMap: Readonly<Record<string, { readonly name: string; readonly loc: Range }>>;
  readonly f: Readonly<Record<string, number>>;
  readonly statementMap: Readonly<Record<string, Range>>;
  readonly s: Readonly<Record<string, number>>;
  readonly branchMap: Readonly<Record<string, { readonly loc: { readonly start: Position } }>>;
  readonly b: Readonly<Record<string, readonly number[]>>;
}

/**
 * Each function the coverage lists, with the share of its statements that ran. A function joins its coverage entry by
 * where its body starts, which is where Istanbul's function location starts.
 */
export function measuredFromIstanbul(
  file: string,
  sites: readonly FunctionSite[],
  coverage: IstanbulFileCoverage,
): MeasuredFunction[] {
  const statements = Object.entries(coverage.statementMap).map(([id, range]) => ({
    range,
    ran: (coverage.s[id] ?? 0) > 0,
  }));
  const branches = Object.entries(coverage.branchMap).map(([id, { loc }]) => ({
    range: { start: loc.start, end: loc.start },
    untaken: (coverage.b[id] ?? []).filter((count) => count === 0).length,
  }));

  return sites.flatMap((site) => {
    const { name, complexity, start, bodyStart, publicMethod } = site;
    const nested = sites.filter((other) => other !== site && within(other, site)).map(bodyOf);
    const isOwn = ({ range }: { readonly range: Range }) =>
      within(range, bodyOf(site)) && !nested.some((inner) => within(range, inner));
    const own = statements.filter(isOwn);
    const untestedBranches = branches.filter(isOwn).reduce((sum, { untaken }) => sum + untaken, 0);

    const id = Object.keys(coverage.fnMap).find((key) => {
      const entry = coverage.fnMap[key];

      return entry !== undefined && samePosition(entry.loc.start, bodyStart);
    });

    if (id === undefined) {
      return [];
    }

    const called = (coverage.f[id] ?? 0) > 0;
    const share = own.length > 0 ? own.filter(({ ran }) => ran).length / own.length : Number(called);

    return [{ file, line: start.line, name, complexity, coverage: share, called, publicMethod, untestedBranches }];
  });
}

/**
 * Each file's coverage, by path, from the coverage map Vitest hands a reporter. Vitest types that map `unknown`; it is
 * an Istanbul coverage map, read here through its JSON form and checked before the join trusts it.
 */
export function parseCoverageMap(value: unknown): Map<string, IstanbulFileCoverage> {
  const json = hasToJSON(value) ? value.toJSON() : value;

  if (!isRecord(json)) {
    throw new Error('The coverage map is not an object of files.');
  }

  return new Map(
    Object.entries(json).map(([path, file]) => {
      if (!isFileCoverage(file)) {
        throw new Error(`The coverage of ${path} is not an Istanbul file coverage.`);
      }

      return [path, file];
    }),
  );
}

function hasToJSON(value: unknown): value is { toJSON: () => unknown } {
  return typeof value === 'object' && value !== null && 'toJSON' in value && typeof value.toJSON === 'function';
}

function isFileCoverage(value: unknown): value is IstanbulFileCoverage {
  return (
    isRecord(value) &&
    isRecordOf(value['fnMap'], (entry) => isRecord(entry) && typeof entry['name'] === 'string' && isRange(entry['loc'])) &&
    isRecordOf(value['f'], isCount) &&
    isRecordOf(value['statementMap'], isRange) &&
    isRecordOf(value['s'], isCount) &&
    isRecordOf(value['branchMap'], (entry) => isRecord(entry) && isRecord(entry['loc']) && isPosition(entry['loc']['start'])) &&
    isRecordOf(value['b'], (counts) => Array.isArray(counts) && counts.every(isCount))
  );
}

function isRange(value: unknown): value is Range {
  return isRecord(value) && isPosition(value['start']) && isPosition(value['end']);
}

function isPosition(value: unknown): value is Position {
  return isRecord(value) && isCount(value['line']) && isCount(value['column']);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number';
}

function isRecordOf(value: unknown, isEntry: (entry: unknown) => boolean): boolean {
  return isRecord(value) && Object.values(value).every(isEntry);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** From where the function's body starts to its end: the stretch whose statements are its own. */
function bodyOf({ bodyStart, end }: FunctionSite): Range {
  return { start: bodyStart, end };
}

function within(inner: Range, outer: Range): boolean {
  return !isBefore(inner.start, outer.start) && !isBefore(outer.end, inner.end);
}

function samePosition(a: Position, b: Position): boolean {
  return a.line === b.line && a.column === b.column;
}
