import { parse, TSError, type TSESTree } from '@typescript-eslint/typescript-estree';

/** One parsed file. Every metric reads from this; none parses again. */
export interface Source {
  /** As the caller named it; it picks JSX by its extension and names errors, and is never opened. */
  readonly file: string;
  readonly text: string;
  /** With `range`, `loc`, `tokens` and `comments`, as ESLint's parsers give it. */
  readonly ast: TSESTree.Program;
}

export interface ParseFailure {
  /** `<file>:<line>:<column> <message>`, with the line and column ESLint gives for the same error. */
  readonly parseError: string;
}

/** Parses with typescript-estree as `@typescript-eslint/parser` does by default. Reads no file and no configuration. */
export function parseSource(text: string, file: string): Source | ParseFailure {
  try {
    return { file, text, ast: parse(text, { filePath: file, loc: true, range: true, tokens: true, comment: true }) };
  } catch (error) {
    if (error instanceof TSError) {
      return { parseError: `${file}:${String(error.lineNumber)}:${String(error.column)} ${error.message}` };
    }

    throw error;
  }
}
