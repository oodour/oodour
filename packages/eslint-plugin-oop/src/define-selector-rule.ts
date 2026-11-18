import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { createRule, type OopRuleModule, type Remedy, type Tier } from './create-rule.ts';

export type SelectorFix = (
  node: TSESTree.Node,
  fixer: TSESLint.RuleFixer,
  sourceCode: Readonly<TSESLint.SourceCode>,
) => TSESLint.RuleFix | readonly TSESLint.RuleFix[] | null;

/** The remedy is derived from which of these a row has: `fix`, `suggest`, or only the `because` of `none`. */
type SelectorRemedyFields =
  | { readonly fix: SelectorFix; readonly suggest?: never; readonly because?: never }
  | {
      readonly suggest: { readonly message: string; readonly because: string; readonly fix: SelectorFix };
      readonly fix?: never;
      readonly because?: never;
    }
  | { readonly because: string; readonly fix?: never; readonly suggest?: never };

/** One measured esquery selector, or a few that find the same thing, as one rule of this plugin. */
export type SelectorRow = {
  readonly name: string;
  readonly description: string;
  readonly concept: string;
  readonly tier: Tier;
  readonly selectors: readonly [string, ...string[]];
  readonly message: string;
} & SelectorRemedyFields;

export type SelectorMessageId = 'found' | 'suggestion';

function remedyOf(row: SelectorRemedyFields): Remedy {
  if (row.because !== undefined) {
    return { kind: 'none', because: row.because };
  }

  if (row.suggest !== undefined) {
    return { kind: 'suggestion', because: row.suggest.because };
  }

  return { kind: 'fix' };
}

export function defineSelectorRule(row: SelectorRow): OopRuleModule<SelectorMessageId, []> {
  const childStepInHas = row.selectors.find((selector) => /:has\(\s*>/.test(selector));

  if (childStepInHas !== undefined) {
    throw new Error(
      `${row.name}: "${childStepInHas}" puts a child step in :has(> ...), which esquery 1.7 silently matches nothing for once the step is longer than one node; use a descendant or sibling (~) form.`,
    );
  }

  return createRule<[], SelectorMessageId>({
    name: row.name,
    meta: {
      type: 'suggestion',
      docs: {
        description: row.description,
        concept: row.concept,
        requiresTypeChecking: false,
        remedy: remedyOf(row),
        tier: row.tier,
        skipsTestFiles: true,
      },
      // A row without a suggestion never reports `suggestion`; the id exists so every row shares one message type.
      messages: { found: row.message, suggestion: row.suggest?.message ?? row.message },
      schema: [],
      defaultOptions: [],
    },
    create: (context) => {
      const { fix, suggest } = row;
      const report = (node: TSESTree.Node): void => {
        context.report({
          node,
          messageId: 'found',
          ...(fix === undefined ? {} : { fix: (fixer) => fix(node, fixer, context.sourceCode) }),
          ...(suggest === undefined
            ? {}
            : {
                suggest: [{ messageId: 'suggestion', fix: (fixer) => suggest.fix(node, fixer, context.sourceCode) }],
              }),
        });
      };

      return Object.fromEntries(row.selectors.map((selector) => [selector, report]));
    },
  });
}
