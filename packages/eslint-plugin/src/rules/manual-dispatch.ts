import {
  type ManualDispatch,
  manualDispatch as manualDispatchMetric,
} from '@oodour/core';
import { defineMetricRule } from '../define-metric-rule.ts';

export const manualDispatch = defineMetricRule<
  [],
  'found',
  readonly ManualDispatch[]
>({
  name: 'manual-dispatch',
  metric: manualDispatchMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Report an if chain that picks what to do by testing which class an object is',
      concept: 'Manual Dispatch',
      cures: ['duck type'],
      requiresTypeChecking: false,
      remedy: {
        kind: 'none',
        because:
          'the message every class should answer is a design decision no tool can make',
      },
      tier: 'strict',
      skipsTestFiles: true,
    },
    messages: {
      found:
        "Stop and look: Manual Dispatch, this chain tests which class '{{subject}}' is to decide what to do. Look for " +
        'what this code needs from every object it tests. Cure: define the duck type, one message every one of these ' +
        'classes answers, so the code sends it without asking.',
    },
    schema: [],
    defaultOptions: [],
  },
  check({ value }, context) {
    for (const { node, subject } of value) {
      context.report({ node, messageId: 'found', data: { subject } });
    }
  },
});
