import { measure, type Measurement, type Measurements, type Metric, type UnitKind } from '@oodour/core';
import { ESLintUtils } from '@typescript-eslint/utils';
import type { RuleContext, SourceCode } from '@typescript-eslint/utils/ts-eslint';
import { createRule, type OopRuleDefinition, type OopRuleModule } from './create-rule.ts';

/** The metrics the enabled rules asked for on one file, and their one walk once it ran. */
interface Batch {
  readonly metrics: Set<Metric<unknown>>;
  measured?: Measurements;
}

const batches = new WeakMap<SourceCode, Batch>();

export interface MetricRuleDefinition<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TValue,
  TKind extends UnitKind = UnitKind,
> extends Omit<OopRuleDefinition<TOptions, TMessageIds>, 'create'> {
  readonly metric: Metric<TValue, TKind>;
  /** Called once per measured unit, in source order; reports through `context` or passes. */
  readonly check: (
    measurement: Measurement<TValue, TKind>,
    context: Readonly<RuleContext<TMessageIds, TOptions>>,
    options: Readonly<TOptions>,
  ) => void;
}

/**
 * A rule that reports from a core metric. Every metric rule enabled on a file joins one batch, and the first of them to
 * reach `Program:exit` walks the file once for the whole batch: every rule has registered by then, since ESLint creates
 * all rules before it walks.
 */
export function defineMetricRule<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TValue,
  TKind extends UnitKind = UnitKind,
>(definition: MetricRuleDefinition<TOptions, TMessageIds, TValue, TKind>): OopRuleModule<TMessageIds, TOptions> {
  const { metric, check, ...rule } = definition;

  return createRule({
    ...rule,
    create(context, options) {
      const { sourceCode } = context;

      if (rule.meta.docs.requiresTypeChecking) {
        // Throws typescript-eslint's own error, which says how to turn type information on, when the file has none.
        ESLintUtils.getParserServices(context);
      }

      const batch = batches.get(sourceCode) ?? { metrics: new Set() };

      batches.set(sourceCode, batch);
      batch.metrics.add(metric);

      return {
        'Program:exit'() {
          const { scopeManager, parserServices } = sourceCode;
          const program = parserServices?.program;
          const esTreeNodeToTSNodeMap = parserServices?.esTreeNodeToTSNodeMap;

          batch.measured ??= measure(
            {
              file: context.filename,
              text: sourceCode.text,
              ast: sourceCode.ast,
              ...(scopeManager === null ? {} : { scopes: scopeManager }),
              ...(program && esTreeNodeToTSNodeMap ? { types: { program, esTreeNodeToTSNodeMap } } : {}),
            },
            [...batch.metrics],
          );

          for (const measurement of batch.measured.of(metric)) {
            check(measurement, context, options);
          }
        },
      };
    },
  });
}
