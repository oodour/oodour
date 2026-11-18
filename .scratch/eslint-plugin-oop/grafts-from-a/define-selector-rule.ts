import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { CodemodName } from '../codemods/codemod-registry.ts';
import { defineOopRule, type OopRule } from './define-oop-rule.ts';

/**
 * One esquery selector from the audit, as its own rule. Replaces a `no-restricted-syntax` entry so that the
 * consumer's own `no-restricted-syntax` is never replaced (options do not merge across config objects), each
 * selector toggles alone, and a row can carry a fix, a suggestion or a codemod.
 *
 * The cure is derived from which field the row has, so a row cannot claim a cure it does not offer:
 * `fix` -> fix, `suggest` -> suggestion, `codemod` -> codemod, `why` -> none. Exactly one is allowed (the union).
 */
interface SelectorRowBase {
  /** Rule name without namespace, kebab-case, says what it finds: `no-new-in-constructor`. */
  readonly name: string;
  readonly concept: string;
  readonly description: string;
  /** esquery selector; probed against the audit's probe file before it lands. */
  readonly selector: string;
  /** Claude's own words. */
  readonly message: string;
}

export type SelectorRow = SelectorRowBase &
  (
    | { readonly fix: (node: TSESTree.Node, fixer: TSESLint.RuleFixer) => TSESLint.RuleFix | null }
    | { readonly suggest: { readonly message: string; readonly fix: (node: TSESTree.Node, fixer: TSESLint.RuleFixer) => TSESLint.RuleFix | null } }
    | { readonly codemod: CodemodName }
    | { readonly why: string }
  );

/** A selector rule takes no options; the selector is the configuration, and a consumer turns the rule off instead. */
export function defineSelectorRule(row: SelectorRow): OopRule<[], 'found' | 'suggestion'> {
  // TODO: defineOopRule({ name: row.name, concept, cure: cureOf(row), requiresTypeChecking: false,
  //   meta: { type: 'suggestion', docs, messages: { found: row.message, suggestion: suggest message or '' }, schema: [],
  //     defaultOptions: [] },
  //   create: (context) => ({ [row.selector]: (node) => context.report({ node, messageId: 'found', fix?, suggest?,
  //     data: codemod ? codemodTarget(context, node) : {} }) }) })
  void defineOopRule;
  void row;
  throw new Error('not implemented');
}
