import type { Codemod } from '../codemod.ts';
import { hideDelegate } from './hide-delegate.ts';

/**
 * The codemod registry. The key is the name a rule message and the command line use, and it equals the file name
 * (`index.test.ts` checks this folder against these keys, the same check `rules/index.test.ts` runs).
 *
 * Loaded by `run-codemod.ts` only. `create-rule.ts` imports the `CodemodName` type and nothing else, so linting
 * never loads ts-morph.
 */
export const codemods = {
  'hide-delegate': hideDelegate,
} satisfies Record<string, Codemod>;

/** A rule's `remedy.codemod` has this type: a message cannot name a codemod that does not exist. */
export type CodemodName = keyof typeof codemods;
