import { type FlogCounts, flogScore as flogScoreMetric } from '@oodour/core';
import { ASTUtils } from '@typescript-eslint/utils';
import { defineMetricRule } from '../define-metric-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

/**
 * Flog score of each function: Flog's weighted ABC, where an event deeper in the function weighs more, translated from
 * Ruby to JavaScript and TypeScript. A callback passed to a call counts toward the function around it.
 */
export const flogScore = defineMetricRule<
  Options,
  'found',
  FlogCounts,
  'function'
>({
  name: 'flog-score',
  metric: flogScoreMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a function whose Flog score is above the limit',
      concept: 'Long Function',
      cures: [
        'Extract Function',
        'Replace Nested Conditional with Guard Clauses',
        'Decompose Conditional',
      ],
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'recommended',
      strictOptions: [{ max: 15 }],
    },
    messages: {
      found:
        'Stop and look: Long Function, {{name}} has Flog score {{score}} (at most {{max}}) from weighted counts of ' +
        '{{a}} assignments, {{b}} branches and {{c}} calls; an event weighs more the deeper it is nested, and ' +
        'eval, dynamic dispatch and reflection weigh most. Cure: Extract Function for each nested step, Replace ' +
        'Nested Conditional with Guard Clauses, Decompose Conditional, or a named method in place of a dynamic call.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'number', minimum: 0 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ max: 25 }],
  },
  check({ unit, value: { a, b, c } }, context, [{ max }]) {
    const total = Math.hypot(a, b, c);

    if (total > max) {
      const name = ASTUtils.getFunctionNameWithKind(
        unit.node,
        context.sourceCode,
      );
      const data = {
        name,
        score: total.toFixed(1),
        a: a.toFixed(1),
        b: b.toFixed(1),
        c: c.toFixed(1),
        max,
      };

      context.report({ node: unit.node, messageId: 'found', data });
    }
  },
});
