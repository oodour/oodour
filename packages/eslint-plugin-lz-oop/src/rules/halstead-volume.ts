import { AST_TOKEN_TYPES, ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

type Range = TSESTree.Range;

const operandTokens = new Set([
  'Identifier',
  'PrivateIdentifier',
  'JSXIdentifier',
  'Numeric',
  'String',
  'Template',
  'RegularExpression',
  'Boolean',
  'Null',
  'JSXText',
]);
const typeOnly = [
  'TSTypeAnnotation',
  'TSTypeParameterDeclaration',
  'TSTypeParameterInstantiation',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  ':matches(TSAsExpression, TSSatisfiesExpression, TSTypeAssertion) > .typeAnnotation',
];

function kindOf(token: TSESTree.Token): 'operand' | 'operator' | undefined {
  if (operandTokens.has(token.type)) {
    return 'operand';
  }

  if (token.type === AST_TOKEN_TYPES.Keyword) {
    return token.value === 'this' || token.value === 'super' ? 'operand' : 'operator';
  }

  return token.type === AST_TOKEN_TYPES.Punctuator && !')]}'.includes(token.value) ? 'operator' : undefined;
}

const within = ([start, end]: Range, ranges: readonly Range[]): boolean =>
  ranges.some(([from, to]) => start >= from && end <= to);

/**
 * Halstead volume of each function: its length (operators and operands used) times the base-2 logarithm of its
 * vocabulary (distinct operators and operands). A nested function and type-only syntax are left out of the count.
 */
export const halsteadVolume = createRule<Options, 'found'>({
  name: 'halstead-volume',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a function whose Halstead volume is above the limit',
      concept: 'Long Function',
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'recommended',
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
    defaultOptions: [{ max: 1000 }],
  },
  create(context, [{ max }]) {
    const { sourceCode } = context;
    const nested: Range[][] = [];
    const types: Range[] = [];

    return {
      ':function'(node: FunctionNode) {
        nested.at(-1)?.push(node.range);
        nested.push([]);
      },
      ':function:exit'(node: FunctionNode) {
        const skip = [...(nested.pop() ?? []), ...types];
        const distinct = { operand: new Set<string>(), operator: new Set<string>() };
        let length = 0;

        for (const token of sourceCode.getTokens(node)) {
          const kind = kindOf(token);

          if (kind !== undefined && !within(token.range, skip)) {
            distinct[kind].add(token.value);
            length += 1;
          }
        }

        const vocabulary = distinct.operand.size + distinct.operator.size;
        const volume = vocabulary > 1 ? length * Math.log2(vocabulary) : 0;

        if (volume > max) {
          const name = ASTUtils.getFunctionNameWithKind(node, sourceCode);

          context.report({ node, messageId: 'found', data: { name, volume: volume.toFixed(1), max, length, vocabulary } });
        }
      },
      ...Object.fromEntries(typeOnly.map((selector) => [selector, (node: TSESTree.Node) => types.push(node.range)])),
    };
  },
});
