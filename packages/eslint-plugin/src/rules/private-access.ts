import {
  type PrivateAccess,
  privateAccess as privateAccessMetric,
} from '@oodour/core';
import { defineMetricRule } from '../define-metric-rule.ts';

type Options = [{ readonly underscore: boolean }];

export const privateAccess = defineMetricRule<
  Options,
  'found',
  readonly PrivateAccess[]
>({
  name: 'private-access',
  metric: privateAccessMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Report code that reaches into another object's private member",
      concept: 'Inappropriate Intimacy',
      cures: ['public message'],
      requiresTypeChecking: false,
      remedy: {
        kind: 'none',
        because:
          'which public message serves the need is a design decision no tool can make',
      },
      tier: 'recommended',
      strictOptions: [{ underscore: true }],
      defaultsNeedTypes: true,
    },
    messages: {
      found:
        "Stop and look: Inappropriate Intimacy, this reaches into the private member '{{member}}' of another object. " +
        'Look for why this code needs it. Cure: ask its class for a public message named for that need; only when none ' +
        'can exist, confine this access to one place. A test sends public messages and tests private code only while ' +
        "that code's design is unsettled, apart from the public tests; settled private code that needs tests may move " +
        'into a collaborator.',
    },
    schema: [
      {
        type: 'object',
        properties: { underscore: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ underscore: false }],
  },
  check({ value: accesses }, context, [{ underscore }]) {
    for (const { node, nonPublic, underscored } of accesses) {
      const member = nonPublic ?? (underscore ? underscored : undefined);

      if (member !== undefined) {
        context.report({ node, messageId: 'found', data: { member } });
      }
    }
  },
});
