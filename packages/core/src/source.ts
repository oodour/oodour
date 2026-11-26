import { analyze, type ScopeManager } from '@typescript-eslint/scope-manager';
import { parse, simpleTraverse, TSError, type TSESTree } from '@typescript-eslint/typescript-estree';

/** One parsed file. Every metric reads from this; none parses again. */
export interface Source {
  /** As the caller named it; it picks JSX by its extension and names errors, and is never opened. */
  readonly file: string;
  readonly text: string;
  /** With `range`, `loc`, `tokens`, `comments` and every node's `parent`, as ESLint's parsers give it. */
  readonly ast: TSESTree.Program;
  /** The scope analysis of a caller that already has one, such as ESLint's; `scopesOf` builds it otherwise. */
  readonly scopes?: ScopeManager;
}

export interface ParseFailure {
  /** `<file>:<line>:<column> <message>`, with the line and column ESLint gives for the same error. */
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
