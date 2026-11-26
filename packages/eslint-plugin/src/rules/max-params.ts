import { maxParams as maxParamsMetric, type ParameterCount, type UnitOf } from '@oodour/core';
import { AST_NODE_TYPES, ASTUtils, type TSESLint } from '@typescript-eslint/utils';
import { defineMetricRule } from '../define-metric-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

type MeasuredKind = 'function' | 'declared-function';

/**
 * Counts parameters as values the function depends on, as the core's `maxParams` does: the keys of a pattern or of an
 * options object the body only reads, one for a parameter of a named type. A callback argument is not checked.
 */
export const maxParams = defineMetricRule<Options, 'found' | 'foundKeys', ParameterCount, MeasuredKind>({
  name: 'max-params',
  metric: maxParamsMetric,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Report a function that depends on more values than allowed, counting the keys read from an untyped or ' +
        'inline-typed options object',
      concept: 'Long Parameter List',
      cures: ['Introduce Parameter Object', 'Preserve Whole Object', 'Remove Flag Argument'],
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'recommended',
      strictOptions: [{ max: 3 }],
    },
    messages: {
      found:
        'Stop and look: Long Parameter List, {{name}} takes {{count}} parameters (at most {{max}}). Look for values ' +
        'that travel together, or a flag that picks the behaviour. Cure: Introduce Parameter Object, Preserve Whole ' +
        'Object, or Remove Flag Argument; moving the same values into an options object does not cure it.',
      foundKeys:
        'Stop and look: Long Parameter List, {{name}} takes {{count}} parameters, {{keys}} of them keys read from an ' +
        'options object (at most {{max}}). Look for values that travel together, or a flag that picks the behaviour. ' +
        'Cure: Introduce Parameter Object, Preserve Whole Object, or Remove Flag Argument; moving the same values into ' +
        'an options object does not cure it.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'integer', minimum: 0 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ max: 4 }],
  },
  check({ unit, value: { count, keys } }, context, [{ max }]) {
    if (count > max) {
      const name = nameOf(unit.node, context.sourceCode);

      context.report({ node: unit.node, messageId: keys > 0 ? 'foundKeys' : 'found', data: { name, count, keys, max } });
    }
  },
});

function nameOf(node: UnitOf<MeasuredKind>['node'], sourceCode: Readonly<TSESLint.SourceCode>): string {
  if (node.type === AST_NODE_TYPES.TSDeclareFunction) {
    return node.id === null ? 'function' : `function '${node.id.name}'`;
  }

  return ASTUtils.getFunctionNameWithKind(node, sourceCode);
}
