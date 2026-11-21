import { ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

type Range = TSESTree.Range;

// A closing bracket belongs to its opening one, which is counted.
const closingBrackets = new Set(['Punctuator )', 'Punctuator ]', 'Punctuator }']);
const typeOnly = [
  'TSTypeAnnotation',
  'TSTypeParameterDeclaration',
  'TSTypeParameterInstantiation',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  ':matches(TSAsExpression, TSSatisfiesExpression, TSTypeAssertion) > .typeAnnotation',
];


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
        // A token's type keeps an operand apart from an operator of the same text, such as a property named delete.
        const used = sourceCode
          .getTokens(node)
          .filter((token) => !within(token.range, skip))
          .map((token) => `${token.type} ${token.value}`)
          .filter((token) => !closingBrackets.has(token));
        const length = used.length;
        const vocabulary = new Set(used).size;
        const volume = length * Math.log2(vocabulary);

        if (volume > max) {
          const name = ASTUtils.getFunctionNameWithKind(node, sourceCode);

          context.report({ node, messageId: 'found', data: { name, volume: volume.toFixed(1), max, length, vocabulary } });
        }
      },
      ...Object.fromEntries(typeOnly.map((selector) => [selector, (node: TSESTree.Node) => types.push(node.range)])),
    };
  },
});
