import { type AbcCounts, abcSize as abcSizeMetric } from '@oodour/core';
import { ASTUtils } from '@typescript-eslint/utils';
import { defineMetricRule } from '../define-metric-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

/**
 * ABC size as 99 Bottles of OOP counts it: assignments, sends (calls and `new`) and conditions, combined as the length
 * of the vector. Each function is scored alone; a nested function's counts are its own.
 */
export const abcSize = defineMetricRule<Options, 'found', AbcCounts>({
  name: 'abc-size',
  metric: abcSizeMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a function whose ABC size is above the limit',
      concept: 'Long Function',
      cures: [
        'Extract Function',
        'Replace Temp with Query',
        'Inline Variable',
        'Decompose Conditional',
        'Replace Conditional with Polymorphism',
      ],
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'recommended',
      strictOptions: [{ max: 10 }],
    },
    messages: {
      found:
        'Stop and look: Long Function, {{name}} has ABC size {{size}} (at most {{max}}) from {{a}} assignments, ' +
        '{{b}} sends and {{c}} conditions, more than a reader holds at once. Look at the largest count: ' +
        'assignments are often temporaries, sends are steps or collaborators, conditions are choices. Cure: Extract ' +
        'Function for each step, Replace Temp with Query or Inline Variable, Decompose Conditional, or Replace ' +
        'Conditional with Polymorphism.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'number', minimum: 0 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ max: 15 }],
  },
  check({ unit, value: { assignments: a, sends: b, conditions: c } }, context, [{ max }]) {
    const size = Math.hypot(a, b, c);

    if (size > max && unit.kind === 'function') {
      const name = ASTUtils.getFunctionNameWithKind(unit.node, context.sourceCode);

      context.report({ node: unit.node, messageId: 'found', data: { name, size: size.toFixed(1), a, b, c, max } });
    }
  },
});
