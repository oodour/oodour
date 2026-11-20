import { ESLintUtils } from '@typescript-eslint/utils';
import packageJson from '../package.json' with { type: 'json' };
import type { RuleContext, RuleListener, RuleMetaDataDocs, RuleModule } from '@typescript-eslint/utils/ts-eslint';

/**
 * How a reader gets from a report to changed code, in order of preference. Every kind after `fix` says why nothing
 * earlier in the order is possible.
 */
export type Remedy =
  | { readonly kind: 'fix' }
  | { readonly kind: 'suggestion'; readonly because: string }
  | { readonly kind: 'none'; readonly because: string };

export type Tier = 'recommended' | 'strict';

export interface OopRuleDocs {
  /** The smell the rule prompts a look at, which its stop-and-look message names first. */
  readonly concept: string;
  /** Decides whether the rule lands in a `-type-checked` preset and which tester `testRule` runs it under. */
  readonly requiresTypeChecking: boolean;
  readonly remedy: Remedy;
  readonly tier: Tier;
  /** The presets turn the rule on outside test and declaration files only, where its measured noise sits. */
  readonly skipsTestFiles?: true;
  /**
   * The optional plugin package whose rule this one wraps. The rule is then turned on in that plugin's companion config
   * instead of the presets, so the presets work for a consumer who has not installed it.
   */
  readonly companion?: Companion;
  /** The options the strict presets set, where they hold the rule to a tighter limit than its defaults. */
  readonly strictOptions?: readonly unknown[];
}

/** The optional plugin packages, each with a companion config of its own. */
export type Companion = 'unicorn' | 'sonarjs' | 'functional';

/**
 * What a rule module hands to `createRule`: typescript-eslint's `RuleCreator` input, except that `fixable` and
 * `hasSuggestions` come from `docs.remedy` and `defaultOptions` lives in `meta`. `createRule` builds the module itself
 * rather than through `RuleCreator`, whose result types `meta.docs` as optional.
 */
export interface OopRuleDefinition<TOptions extends readonly unknown[], TMessageIds extends string> {
  readonly name: string;
  readonly meta: Omit<
    ESLintUtils.NamedCreateRuleMeta<TMessageIds, OopRuleDocs, TOptions>,
    'fixable' | 'hasSuggestions' | 'defaultOptions'
  > & { readonly defaultOptions: TOptions };
  readonly create: (context: Readonly<RuleContext<TMessageIds, TOptions>>, options: Readonly<TOptions>) => RuleListener;
}

export type OopRuleModule<
  TMessageIds extends string = string,
  TOptions extends readonly unknown[] = readonly unknown[],
> = RuleModule<TMessageIds, TOptions, OopRuleDocs> & {
  readonly name: string;
  readonly meta: { readonly docs: OopRuleDocs & RuleMetaDataDocs };
};

/**
 * The one way to define a rule in this package. Sets the docs URL, derives `fixable` and `hasSuggestions` from the
 * remedy, and ends every message of a `none` rule with the reason no automatic change exists.
 */
export function createRule<TOptions extends readonly unknown[], TMessageIds extends string>(
  definition: OopRuleDefinition<TOptions, TMessageIds>,
): OopRuleModule<TMessageIds, TOptions> {
  const { remedy } = definition.meta.docs;
  const sentence = remedy.kind === 'none' ? ` No automatic change: ${remedy.because}.` : '';
  const messages: Record<TMessageIds, string> = { ...definition.meta.messages };
  const isMessageId = (key: string): key is TMessageIds => Object.hasOwn(messages, key);

  Object.keys(messages)
    .filter(isMessageId)
    .forEach((id) => {
      messages[id] = `${messages[id]}${sentence}`;
    });

  return {
    name: definition.name,
    meta: {
      ...definition.meta,
      docs: { ...definition.meta.docs, url: packageJson.homepage },
      ...(remedy.kind === 'fix' ? { fixable: 'code' } : {}),
      ...(remedy.kind === 'suggestion' ? { hasSuggestions: true } : {}),
      messages,
    },
    create: (context: Readonly<RuleContext<TMessageIds, TOptions>>) =>
      definition.create(context, ESLintUtils.applyDefault<TOptions, TOptions>(definition.meta.defaultOptions, context.options)),
  };
}
