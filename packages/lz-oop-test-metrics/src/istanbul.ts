import type { MeasuredFunction } from './crap.ts';
import type { FunctionSite, Position } from './functions.ts';

/** A stretch of source, from its first character to just past its last. */
export interface Range {
  readonly start: Position;
  readonly end: Position;
}

/** The parts of an Istanbul file coverage the join reads: functions and statements, each with its hit count. */
export interface IstanbulFileCoverage {
  readonly fnMap: Readonly<Record<string, { readonly name: string; readonly loc: Range }>>;
  readonly f: Readonly<Record<string, number>>;
  readonly statementMap: Readonly<Record<string, Range>>;
  readonly s: Readonly<Record<string, number>>;
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

  return sites.flatMap(({ name, complexity, start, bodyStart, end }) => {
    const own = statements.filter(({ range }) => within(range, { start: bodyStart, end }));

    return Object.values(coverage.fnMap).some(({ loc }) => samePosition(loc.start, bodyStart))
      ? [{ file, line: start.line, name, complexity, coverage: own.filter(({ ran }) => ran).length / own.length }]
      : [];
  });
}

function within(inner: Range, outer: Range): boolean {
  return !isBefore(inner.start, outer.start) && !isBefore(outer.end, inner.end);
}

function isBefore(a: Position, b: Position): boolean {
  return a.line < b.line || (a.line === b.line && a.column < b.column);
}

function samePosition(a: Position, b: Position): boolean {
  return a.line === b.line && a.column === b.column;
}
