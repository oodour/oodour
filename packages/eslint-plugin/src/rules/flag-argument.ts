import { type FlagArgument, flagArgument as flagArgumentMetric } from '@oodour/core';
import { ASTUtils } from '@typescript-eslint/utils';
import { defineMetricRule } from '../define-metric-rule.ts';

/**
 * Reports a parameter the body branches on when it can only hold a few constants: its declared type is `boolean` or a
 * union of literals (by the syntax, or by the checker when type information is there), its default is a boolean or a
 * string, or a call in the same file passes it a boolean, string or number literal. A callback passed straight to a call
 * is not checked, since the callee decides its parameters, nor is the parameter an assertion function asserts, nor a
 * factory, whose every `return` creates an object.
 */
export const flagArgument = defineMetricRule<[], 'found', readonly FlagArgument[]>({
  name: 'flag-argument',
  metric: flagArgumentMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a parameter whose value the function branches on to pick which logic runs',
      concept: 'Flag Argument',
      cures: ['Remove Flag Argument'],
      requiresTypeChecking: false,
      remedy: { kind: 'none', because: 'which functions or objects take over each value is a design choice' },
      tier: 'recommended',
      skipsTestFiles: true,
    },
    messages: {
      found:
        "Stop and look: Flag Argument, the {{function}} branches on its parameter '{{name}}'. Look for callers that " +
        'pass a constant to choose a path. Cure: Remove Flag Argument, a named function for each value; or, when ' +
        'each value stands for a kind of behaviour, pass in an object of that kind and send it a message.',
    },
    schema: [],
    defaultOptions: [],
  },
  check({ value: flags }, context) {
    for (const { param, fn, name } of flags) {
      context.report({
        node: param,
        messageId: 'found',
        data: { function: ASTUtils.getFunctionNameWithKind(fn, context.sourceCode), name },
      });
    }
  },
});
