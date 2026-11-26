import { type HalsteadCounts, halsteadVolume as halsteadVolumeMetric } from '@oodour/core';
import { ASTUtils } from '@typescript-eslint/utils';
import { defineMetricRule } from '../define-metric-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

/**
 * Halstead volume of each function: its length (operators and operands used) times the base-2 logarithm of its
 * vocabulary (distinct operators and operands). A nested function and type-only syntax are left out of the count.
 */
export const halsteadVolume = defineMetricRule<Options, 'found', HalsteadCounts>({
  name: 'halstead-volume',
  metric: halsteadVolumeMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a function whose Halstead volume is above the limit',
      concept: 'Long Function',
      cures: ['Extract Function', 'Replace Temp with Query', 'Introduce Parameter Object'],
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'recommended',
      strictOptions: [{ max: 400 }],
    },
    messages: {
      found:
        'Stop and look: Long Function, {{name}} has Halstead volume {{volume}} (at most {{max}}) from {{length}} uses ' +
        'of {{vocabulary}} distinct operators and operands, more than a reader holds at once. A long length means ' +
        'many steps; a large vocabulary means many names and operations to tell apart. Cure: Extract Function for ' +
        'each step, Replace Temp with Query, or Introduce Parameter Object for values that travel together.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'number', minimum: 0 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ max: 750 }],
  },
  check({ unit, value: { length, vocabulary, volume } }, context, [{ max }]) {
    if (volume > max && unit.kind === 'function') {
      const name = ASTUtils.getFunctionNameWithKind(unit.node, context.sourceCode);

      context.report({
        node: unit.node,
        messageId: 'found',
        data: { name, volume: volume.toFixed(1), max, length, vocabulary },
      });
    }
  },
});
