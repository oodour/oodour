/**
 * Looks a rule up in the package that is installed right now. This is the only module that imports the optional
 * third-party plugins, and only tests import it: the plugin itself never loads unicorn, sonarjs or functional.
 */
import type { Rule } from 'eslint';
import type { SourceId } from '../existing-rules.ts';

export interface InstalledRule {
  /** The ID as a config file writes it. */
  readonly id: string;
  readonly module: Rule.RuleModule;
  /** `<package>@<version>`, for the failure message of a drift test. */
  readonly installedFrom: string;
  /** From the installed rule's `meta.deprecated`. */
  readonly deprecated: boolean;
  /** From the installed rule's `meta.docs.requiresTypeChecking`. */
  readonly requiresTypeChecking: boolean;
}

/** Where each source's rules are loaded from. Keyed by `SourceId`: a new source without an entry does not compile. */
type InstalledRuleMaps = Readonly<Record<SourceId, () => ReadonlyMap<string, unknown>>>;

// TODO
// const installedRuleMaps: InstalledRuleMaps = {
//   core:                () => builtinRules                      from 'eslint/use-at-your-own-risk'
//   'typescript-eslint': () => rules of '@typescript-eslint/eslint-plugin'
//   unicorn:             () => rules of 'eslint-plugin-unicorn'
//   sonarjs:             () => rules of 'eslint-plugin-sonarjs'
//   functional:          () => rules of 'eslint-plugin-functional'
// };
export type { InstalledRuleMaps };

/**
 * Returns the installed rule for a catalog entry.
 *
 * Throws `No rule "<name>" in <package>@<version>` when the installed package has no such rule. That throw is the
 * drift test: ESLint says nothing about an unknown rule that is set to "off".
 *
 * The three rule type families (ESLint core, typescript-eslint, third-party) meet here. A loaded value is narrowed
 * to `Rule.RuleModule` by a runtime check that it is an object with a `create` function, which is ESLint's own
 * definition of a rule. No cast.
 */
export function installedRule(id: string): InstalledRule {
  throw new Error(`not implemented: ${id}`);
}
