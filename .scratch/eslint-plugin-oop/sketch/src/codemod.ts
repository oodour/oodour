import type { Project } from 'ts-morph';

/** Where the lint report pointed: the `<file>:<line>[:<column>]` a person copies from the ESLint output. */
export interface CodemodTarget {
  readonly file: string;
  readonly line: number;
  readonly column?: number;
}

export type CodemodOutcome =
  | { readonly outcome: 'changed'; readonly files: readonly string[] }
  /** The codemod found nothing it can change safely at the target, and changed nothing. */
  | { readonly outcome: 'refused'; readonly because: string };

/**
 * A cure that touches more than the linted file, which an ESLint fixer cannot do.
 *
 * Contract:
 * - `apply` edits `project` in memory and never saves. The runner decides whether to write (`run-codemod.ts`),
 *   and a test hands in an in-memory project (`testing/in-memory-project.ts`), so no test touches the disk.
 * - It refuses instead of guessing: when the target does not match exactly what the codemod handles, it returns
 *   `refused` and leaves every file as it was.
 * - Applied to its own output at the same target, it refuses. A second run changes nothing.
 */
export interface Codemod {
  /** One line for the runner's `--list` output and the README. */
  readonly summary: string;
  apply(project: Project, target: CodemodTarget): CodemodOutcome;
}
