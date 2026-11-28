import {
  type RepeatedSwitch,
  repeatedSwitches as repeatedSwitchesMetric,
} from '@oodour/core';
import { defineMetricRule } from '../define-metric-rule.ts';

/**
 * Reports every switch in a file whose case labels, compared as source text in any order and without `default`, match
 * those of another switch in the file. ESLint sees one file at a time, so repetition across files goes unreported.
 */
export const repeatedSwitches = defineMetricRule<
  [],
  'found',
  readonly RepeatedSwitch[]
>({
  name: 'repeated-switches',
  metric: repeatedSwitchesMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Report switches in one file that choose among the same cases',
      concept: 'Repeated Switches',
      cures: ['Replace Conditional with Polymorphism'],
      requiresTypeChecking: false,
      remedy: {
        kind: 'none',
        because:
          'which objects take over each case is a design decision no tool can make',
      },
      tier: 'recommended',
      skipsTestFiles: true,
    },
    messages: {
      found:
        'Stop and look: Repeated Switches, this file has {{count}} switches on the cases {{cases}}. Look for the same ' +
        'choice in other files. Cure: Replace Conditional with Polymorphism, an object per case chosen once by a ' +
        'factory, so each switch becomes a message to that object.',
    },
    schema: [],
    defaultOptions: [],
  },
  check({ value }, context) {
    for (const { cases, switches } of value) {
      for (const node of switches) {
        context.report({
          node,
          messageId: 'found',
          data: { count: switches.length, cases },
        });
      }
    }
  },
});
