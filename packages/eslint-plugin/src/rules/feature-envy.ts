import { type Envy, featureEnvy as featureEnvyMetric } from '@oodour/core';
import { defineMetricRule } from '../define-metric-rule.ts';

export const featureEnvy = defineMetricRule<[], 'found', readonly Envy[]>({
  name: 'feature-envy',
  metric: featureEnvyMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a method that uses another object more than its own',
      concept: 'Feature Envy',
      cures: ['Move Function', 'Extract Function'],
      requiresTypeChecking: false,
      remedy: {
        kind: 'none',
        because:
          'which class should own the behaviour is a design decision no tool can make',
      },
      tier: 'strict',
      skipsTestFiles: true,
    },
    messages: {
      found:
        "Stop and look: Feature Envy, this method uses '{{name}}' {{count}} times and its own object {{own}}. Look for " +
        "what it asks of '{{name}}'. Cure: Move Function, often to the class of '{{name}}', with Extract Function " +
        'first when only part of the method envies; when it draws on several objects about equally, a new object may ' +
        'own that behaviour. Leave it where it is when this object plays a role, such as a strategy or visitor, that ' +
        "'{{name}}' hands itself to.",
    },
    schema: [],
    defaultOptions: [],
  },
  check({ value: envies }, context) {
    for (const { method, name, count, own } of envies) {
      context.report({
        node: method,
        messageId: 'found',
        data: { name, count, own },
      });
    }
  },
});
