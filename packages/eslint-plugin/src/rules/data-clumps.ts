import { type DataClump, dataClumps as dataClumpsMetric } from '@oodour/core';
import { defineMetricRule } from '../define-metric-rule.ts';

export const dataClumps = defineMetricRule<[], 'found', readonly DataClump[]>({
  name: 'data-clumps',
  metric: dataClumpsMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Report a group of parameters that travels together through three or more functions of one scope',
      concept: 'Data Clumps',
      cures: ['Introduce Parameter Object', 'Preserve Whole Object'],
      requiresTypeChecking: false,
      remedy: {
        kind: 'none',
        because:
          'which object the parameters become is a design decision no tool can make',
      },
      tier: 'strict',
      skipsTestFiles: true,
    },
    messages: {
      found:
        'Stop and look: Data Clumps, the parameters {{clump}} travel together through {{count}} functions here. Look ' +
        'for the object they describe. Cure: Introduce Parameter Object, one object for them and the behaviour that ' +
        'uses them; or Preserve Whole Object where a caller already holds an object that carries them.',
    },
    schema: [],
    defaultOptions: [],
  },
  check({ value }, context) {
    for (const { names, holders } of value) {
      context.report({
        node: holders[0].node,
        messageId: 'found',
        data: { clump: names.join(', '), count: holders.length },
      });
    }
  },
});
