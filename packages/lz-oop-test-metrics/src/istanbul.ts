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

  return sites.flatMap((site) => {
    const { name, complexity, start, bodyStart } = site;
    const nested = sites.filter((other) => other !== site && within(other, site)).map(bodyOf);
    const own = statements.filter(
      ({ range }) => within(range, bodyOf(site)) && !nested.some((inner) => within(range, inner)),
    );

    const id = Object.keys(coverage.fnMap).find((key) => {
      const entry = coverage.fnMap[key];

      return entry !== undefined && samePosition(entry.loc.start, bodyStart);
    });

    if (id === undefined) {
      return [];
    }

    const called = (coverage.f[id] ?? 0) > 0 ? 1 : 0;
    const share = own.length > 0 ? own.filter(({ ran }) => ran).length / own.length : called;

    return [{ file, line: start.line, name, complexity, coverage: share }];
  });
}

/** From where the function's body starts to its end: the stretch whose statements are its own. */
function bodyOf({ bodyStart, end }: FunctionSite): Range {
  return { start: bodyStart, end };
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
