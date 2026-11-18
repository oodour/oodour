/**
 * The `oop-codemod` command: the thin shell around the codemods. It parses the arguments, loads the project,
 * calls one `Codemod.apply`, and writes only when asked.
 *
 *   oop-codemod <name> <file>:<line>[:<column>] [--write] [--project <tsconfig path>]
 *   oop-codemod --list
 *
 * Without `--write` it is a dry run: it prints the files the codemod would change and exits 0.
 * Exit codes: 0 changed (or would change), 1 refused, 2 usage error.
 *
 * Until the package is built for publishing, run it as `node packages/eslint-plugin-oop/src/run-codemod.ts`.
 */
import type { CodemodTarget } from './codemod.ts';
import type { CodemodName } from './codemods/index.ts';

export interface CodemodRequest {
  readonly codemod: CodemodName;
  readonly target: CodemodTarget;
  readonly write: boolean;
  /** Defaults to the nearest `tsconfig.json` above the target file. */
  readonly tsconfigPath?: string;
}

export type ParsedArguments =
  | { readonly parsed: 'request'; readonly request: CodemodRequest }
  | { readonly parsed: 'list' }
  | { readonly parsed: 'usage-error'; readonly message: string };

/** The boundary: everything after this function works with a checked `CodemodRequest`. */
export function parseArguments(commandLineArguments: readonly string[]): ParsedArguments {
  throw new Error(`not implemented: ${String(commandLineArguments.length)}`);
}

/** Loads the ts-morph project from the tsconfig, applies the codemod, prints the outcome, saves when `write`. */
export function runCodemod(request: CodemodRequest): number {
  throw new Error(`not implemented: ${request.codemod}`);
}
