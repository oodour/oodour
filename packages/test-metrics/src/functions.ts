import { complexity, measure, parseSource, type Unit, unitName } from '@oodour/core';
import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';

/** A place in a source file: a line from 1 and a column from 0, as ESLint counts them. */
export interface Position {
  readonly line: number;
  readonly column: number;
}

/** A stretch of source, from its first character to just past its last. */
export interface Range {
  readonly start: Position;
  readonly end: Position;
}

/** Whether the first position comes before the second in the source. */
export function isBefore(a: Position, b: Position): boolean {
  return a.line < b.line || (a.line === b.line && a.column < b.column);
}

/** Whether the inner stretch starts no earlier and ends no later than the outer one. */
export function within(inner: Range, outer: Range): boolean {
  return !isBefore(inner.start, outer.start) && !isBefore(outer.end, inner.end);
}

/** The other functions inside this one, at any depth. */
export function nestedIn(site: FunctionSite, sites: readonly FunctionSite[]): FunctionSite[] {
  return sites.filter((other) => other !== site && within(other, site));
}

/**
 * A function as ESLint's `complexity` rule sees it: its name and count, where it starts, and where its body starts.
 * Class field initializers and static blocks count as functions of their own, as the rule counts them.
 */
export interface FunctionSite {
  readonly name: string;
  readonly complexity: number;
  readonly start: Position;
  readonly bodyStart: Position;
  /** Just past its last character. */
  readonly end: Position;
  /** A method or accessor other objects may send: not `#private`, TypeScript `private` or `protected`, or a constructor. */
  readonly publicMethod: boolean;
}

/** Every function in the source, each with the complexity ESLint's `complexity` rule gives it. */
export function functionsIn(file: string, text: string): FunctionSite[] {
  const source = parseSource(text, file);

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return measure(source, [complexity])
    .of(complexity)
    .map(({ unit, value }) => siteOf(unit, value));
}

function siteOf(unit: Unit, complexity: number): FunctionSite {
  const name = unitName(unit);
  const variable = name.includes("'") ? undefined : variableHolding(unit.parent);
  const { loc } = unit.node;
  // A class field initializer or static block is its own body.
  const body = unit.kind === 'function' ? unit.node.body : unit.node;

  return {
    name: variable === undefined ? name : `${name} '${variable}'`,
    complexity,
    start: positionOf(loc.start),
    bodyStart: positionOf(body.loc.start),
    end: positionOf(loc.end),
    publicMethod: isPublicMethod(unit.parent),
  };
}

function isPublicMethod(parent: TSESTree.Node | undefined): boolean {
  return (
    parent?.type === AST_NODE_TYPES.MethodDefinition &&
    parent.kind !== 'constructor' &&
    parent.key.type !== AST_NODE_TYPES.PrivateIdentifier &&
    parent.accessibility !== 'private' &&
    parent.accessibility !== 'protected'
  );
}

/** The name of the variable the function is the value of, as in `const double = (n) => n * 2`. */
function variableHolding(parent: TSESTree.Node | undefined): string | undefined {
  return parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier
    ? parent.id.name
    : undefined;
}

function positionOf({ line, column }: Position): Position {
  return { line, column };
}
