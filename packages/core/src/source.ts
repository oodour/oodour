import { analyze, type ScopeManager, type Variable } from '@typescript-eslint/scope-manager';
import { parse, simpleTraverse, TSError, type TSESTree } from '@typescript-eslint/typescript-estree';
import type ts from 'typescript';

/** One parsed file. Every metric reads from this; none parses again. */
export interface Source {
  /** As the caller named it; it picks JSX by its extension and names errors, and is never opened. */
  readonly file: string;
  readonly text: string;
  /** With `range`, `loc`, `tokens`, `comments` and every node's `parent`, as ESLint's parsers give it. */
  readonly ast: TSESTree.Program;
  /** The scope analysis of a caller that already has one, such as ESLint's; `scopesOf` builds it otherwise. */
  readonly scopes?: ScopeManager;
  /** The program of a caller that type-checked the file, such as ESLint's typed linting; the core never builds one. */
  readonly types?: ExistingTypes;
}

/** A program and the map from this tree's nodes to its nodes; structurally typescript-eslint's parser services. */
export interface ExistingTypes {
  readonly program: ts.Program;
  readonly esTreeNodeToTSNodeMap: { get(node: TSESTree.Node): ts.Node };
}

export interface ParseFailure {
  /**
   * `<file>:<line>:<column> <message>`, with the line and column ESLint gives for the same error; `<file> <message>` for
   * a file nested too deep to parse, which has no position.
   */
  readonly parseError: string;
}

/** Parses with typescript-estree as `@typescript-eslint/parser` does by default. Reads no file and no configuration. */
export function parseSource(text: string, file: string): Source | ParseFailure {
  try {
    const ast = parse(text, { filePath: file, loc: true, range: true, tokens: true, comment: true });

    simpleTraverse(ast, { enter() {} }, true);

    return { file, text, ast };
  } catch (error) {
    if (error instanceof TSError) {
      return { parseError: `${file}:${String(error.lineNumber)}:${String(error.column)} ${error.message}` };
    }

    // A file nested too deep overflows the parser's stack; ESLint reports that as a parsing error of the file too.
    if (error instanceof RangeError) {
      return { parseError: `${file} ${error.message}` };
    }

    throw error;
  }
}

const analyzed = new WeakMap<Source, ScopeManager>();

/**
 * The source's scope analysis: the one its caller handed over, or one built on first use for the tree's source type,
 * so a run whose metrics never ask pays nothing for it.
 */
export function scopesOf(source: Source): ScopeManager {
  const scopes = source.scopes ?? analyzed.get(source) ?? analyze(source.ast, { sourceType: source.ast.sourceType });

  analyzed.set(source, scopes);

  return scopes;
}

const resolvedBySource = new WeakMap<Source, Map<TSESTree.Identifier | TSESTree.JSXIdentifier, Variable>>();

/** The variable a name reads or writes, or `undefined` for one the scope analysis leaves unresolved, such as a global. */
export function variableOf(source: Source, name: TSESTree.Identifier): Variable | undefined {
  let resolved = resolvedBySource.get(source);

  // Stryker disable next-line ConditionalExpression: a rebuilt map holds the same variables; the cache only saves time
  if (resolved === undefined) {
    resolved = new Map(
      scopesOf(source).scopes.flatMap(({ references }) =>
        references.flatMap(({ identifier, resolved: variable }) => (variable ? [[identifier, variable] as const] : [])),
      ),
    );
    // Stryker disable next-line CallExpression: a rebuilt map holds the same variables; the cache only saves time
    resolvedBySource.set(source, resolved);
  }

  return resolved.get(name);
}
