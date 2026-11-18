import type { ESLintUtils } from '@typescript-eslint/utils';
import type { RuleContext, RuleListener, RuleModule } from '@typescript-eslint/utils/ts-eslint';
import type { CodemodName } from './codemods/index.ts';

/**
 * How a reader gets from a report to changed code. The kinds are listed in order of preference, and every kind
 * after the first has to say why nothing earlier in the order is possible.
 *
 * - `fix`: the change is safe and stays inside the linted file. `eslint --fix` applies it.
 * - `suggestion`: the change stays inside the file, but a person has to confirm it.
 * - `codemod`: the change touches other files. The message names the codemod and the command that runs it.
 * - `none`: no automatic change exists. The message says why.
 */
export type Remedy =
  | { readonly kind: 'fix' }
  | { readonly kind: 'suggestion'; readonly because: string }
  | { readonly kind: 'codemod'; readonly codemod: CodemodName; readonly because: string }
  | { readonly kind: 'none'; readonly because: string };

export interface OopRuleDocs {
  /** The lz-oop concept the rule prompts a look at. Same vocabulary as `Cue.cue` in `existing-rules.ts`. */
  readonly concept: string;
  /**
   * Required, with no default. It decides which preset the rule lands in (`presets.ts`) and which tester
   * `testRule` runs it under (`testing/rule-testers.ts`).
   */
  readonly requiresTypeChecking: boolean;
  readonly remedy: Remedy;
}

/**
 * What a rule module hands to `createRule`. It is typescript-eslint's `RuleCreator` input with two differences:
 * - `meta.fixable` and `meta.hasSuggestions` cannot be written. `createRule` sets them from `docs.remedy`, and ESLint
 *   itself throws when a rule fixes or suggests without them, so a rule cannot do more or less than it declares.
 * - `meta.defaultOptions` is required, so the deprecated top-level `defaultOptions` is never needed.
 */
export interface OopRuleDefinition<Options extends readonly unknown[], MessageIds extends string> {
  /** The rule name without the plugin prefix. It equals the file name, which `rules/index.test.ts` checks. */
  readonly name: string;
  readonly meta: Omit<
    ESLintUtils.NamedCreateRuleMeta<MessageIds, OopRuleDocs, Options>,
    'fixable' | 'hasSuggestions' | 'defaultOptions'
  > & { readonly defaultOptions: Options };
  readonly create: (context: Readonly<RuleContext<MessageIds, Options>>, options: Readonly<Options>) => RuleListener;
}

export type OopRuleModule<
  MessageIds extends string = string,
  Options extends readonly unknown[] = readonly unknown[],
> = RuleModule<MessageIds, Options, OopRuleDocs> & { readonly name: string };

/**
 * The sentence `createRule` appends to every message of a rule.
 *
 * - `fix`, `suggestion`: nothing. ESLint and the editor already offer the change.
 * - `codemod`: ` Codemod: npx oop-codemod <name> <file>:<line>` (the command text comes from
 *   `codemod-command.ts`, the same function the runner's usage text calls).
 * - `none`: ` No automatic change: <because>`
 */
export function remedySentence(remedy: Remedy): string {
  throw new Error(`not implemented: ${remedy.kind}`);
}

/**
 * The one way to define a rule in this package.
 *
 * It wraps `ESLintUtils.RuleCreator<OopRuleDocs>` and adds what the author must not have to remember:
 * the docs URL, `fixable` and `hasSuggestions` from the remedy, and the remedy sentence on every message.
 */
export function createRule<Options extends readonly unknown[], MessageIds extends string>(
  definition: OopRuleDefinition<Options, MessageIds>,
): OopRuleModule<MessageIds, Options> {
  // TODO
  // const { remedy } = definition.meta.docs;
  // const messages = each message of definition.meta.messages + remedySentence(remedy);
  // const capability = remedy.kind === 'fix' ? { fixable: 'code' }
  //                  : remedy.kind === 'suggestion' ? { hasSuggestions: true }
  //                  : {};
  // return ESLintUtils.RuleCreator<OopRuleDocs>(ruleDocsUrl)({
  //   name: definition.name,
  //   meta: { ...definition.meta, ...capability, messages },
  //   create: definition.create,
  // });
  throw new Error(`not implemented: ${definition.name}`);
}
