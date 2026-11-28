import {
  type TypeHoppingChain,
  typeHoppingChain as typeHoppingChainMetric,
} from '@oodour/core';
import { defineMetricRule } from '../define-metric-rule.ts';

type Options = [{ readonly maxInterfaces: number }];

/**
 * Law of Demeter by the number of distinct types a chain steps through, not by dots: a fluent pipeline on one array
 * type passes, a walk from an order through its customer to an address does not.
 */
export const typeHoppingChain = defineMetricRule<
  Options,
  'chain',
  readonly TypeHoppingChain[]
>({
  name: 'type-hopping-chain',
  metric: typeHoppingChainMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Report a chain that steps through more distinct types than allowed',
      concept: 'Message Chains',
      cures: ['Hide Delegate'],
      requiresTypeChecking: true,
      remedy: {
        kind: 'none',
        because:
          'the cure adds a delegating method to the nearest object, whose class usually lives in another file; a codemod for it is planned',
      },
      tier: 'strict',
    },
    messages: {
      chain:
        'Stop and look: Message Chains, this chain steps through {{count}} different types against the Law of ' +
        'Demeter, so it breaks when any of them changes. Look for what the chain is after. Cure: Hide Delegate, a method on the nearest object named ' +
        'for that goal.',
    },
    schema: [
      {
        type: 'object',
        properties: { maxInterfaces: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ maxInterfaces: 2 }],
  },
  check({ value: chains }, context, [{ maxInterfaces }]) {
    for (const { node, count } of chains) {
      if (count > maxInterfaces) {
        context.report({
          node,
          messageId: 'chain',
          data: { count: String(count) },
        });
      }
    }
  },
});
