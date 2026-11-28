import { defineSelectorMetric } from '@oodour/core';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { OopRuleModule, Remedy, Tier } from './create-rule.ts';
import { defineMetricRule } from './define-metric-rule.ts';

export type SelectorFix = (
  node: TSESTree.Node,
  fixer: TSESLint.RuleFixer,
  sourceCode: Readonly<TSESLint.SourceCode>,
) => TSESLint.RuleFix | readonly TSESLint.RuleFix[] | null;

/** The remedy is derived from which of these a row has: `fix`, `suggest`, or only the `because` of `none`. */
type SelectorRemedyFields =
  | {
      readonly fix: SelectorFix;
      readonly suggest?: never;
      readonly because?: never;
    }
  | {
      readonly suggest: {
        readonly message: string;
        readonly because: string;
        readonly fix: SelectorFix;
      };
      readonly fix?: never;
      readonly because?: never;
    }
  | {
      readonly because: string;
      readonly fix?: never;
      readonly suggest?: never;
    };

/** One measured esquery selector, or a few that find the same thing, as one rule of this plugin. */
export type SelectorRow = {
  readonly name: string;
  readonly description: string;
  readonly concept: string;
  readonly cures: readonly [string, ...string[]];
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

export function defineSelectorRule(
  row: SelectorRow,
): OopRuleModule<SelectorMessageId, []> {
  const { fix, suggest } = row;

  return defineMetricRule<[], SelectorMessageId, readonly TSESTree.Node[]>({
    name: row.name,
    metric: defineSelectorMetric(row.name, row.selectors),
    meta: {
      type: 'suggestion',
      docs: {
        description: row.description,
        concept: row.concept,
        cures: row.cures,
        requiresTypeChecking: false,
        remedy: remedyOf(row),
        tier: row.tier,
        skipsTestFiles: true,
      },
      // A row without a suggestion never reports `suggestion`; the id exists so every row shares one message type.
      messages: {
        found: row.message,
        suggestion: row.suggest?.message ?? row.message,
      },
      schema: [],
      defaultOptions: [],
    },
    check({ value: nodes }, context) {
      for (const node of nodes) {
        context.report({
          node,
          messageId: 'found',
          ...(fix === undefined
            ? {}
            : { fix: (fixer) => fix(node, fixer, context.sourceCode) }),
          ...(suggest === undefined
            ? {}
            : {
                suggest: [
                  {
                    messageId: 'suggestion',
                    fix: (fixer) =>
                      suggest.fix(node, fixer, context.sourceCode),
                  },
                ],
              }),
        });
      }
    },
  });
}
