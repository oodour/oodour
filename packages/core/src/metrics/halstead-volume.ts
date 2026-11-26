import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';
import { defineMetric } from '../metric.ts';
import type { Source } from '../source.ts';
import type { Position } from '../units.ts';

/** A function's Halstead counts: the operators and operands it uses, and how many of them are distinct. */
export interface HalsteadCounts {
  readonly length: number;
  readonly vocabulary: number;
  /** `length` times the base-2 logarithm of `vocabulary`. */
  readonly volume: number;
}

type Range = TSESTree.Range;

/** The ranges a file's functions leave out of their counts: every function's own, and the type-only syntax. */
interface Skipped {
  readonly functions: Range[];
  readonly types: Range[];
}

// A nested function opens its own unit before the walk enters it, so its enclosing function never sees the node: each
// function files its range here, and the functions around it read it back when they close.
const skippedBySource = new WeakMap<Source, Skipped>();

// A closing bracket belongs to its opening one, which is counted.
const closingBrackets = new Set(['Punctuator )', 'Punctuator ]', 'Punctuator }']);
const typeOnly = new Set<string>([
  AST_NODE_TYPES.TSTypeAnnotation,
  AST_NODE_TYPES.TSTypeParameterDeclaration,
  AST_NODE_TYPES.TSTypeParameterInstantiation,
  AST_NODE_TYPES.TSTypeAliasDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
]);
const typeAssertions = new Set<string>([
  AST_NODE_TYPES.TSAsExpression,
  AST_NODE_TYPES.TSSatisfiesExpression,
  AST_NODE_TYPES.TSTypeAssertion,
]);

/**
 * The Halstead volume of each function: its length (operators and operands used, as tokens) times the base-2 logarithm
 * of its vocabulary (distinct tokens, told apart by their type and text). A nested function and type-only syntax are
 * left out of the count.
 */
export const halsteadVolume = defineMetric({
  name: 'halstead-volume',
  units: ['function'],
  open: ({ node }, source): Skipped => {
    const skipped = skippedBySource.get(source) ?? { functions: [], types: [] };

    skippedBySource.set(source, skipped);
    skipped.functions.push(node.range);

    return skipped;
  },
  enter(node, skipped, at) {
    if (isTypeOnly(node, at)) {
      skipped.types.push(node.range);
    }
  },
  close: (skipped, { node }, source): HalsteadCounts => countsOf(node.range, skipped, source),
});

function isTypeOnly(node: TSESTree.Node, { parent, key }: Position): boolean {
  return typeOnly.has(node.type) || (parent !== undefined && typeAssertions.has(parent.type) && key === 'typeAnnotation');
}

function countsOf(range: Range, { functions, types }: Skipped, { ast, file }: Source): HalsteadCounts {
  if (ast.tokens === undefined) {
    throw new Error(`halstead-volume needs the tokens of ${file}, which its parse left out.`);
  }

  const skip = [...functions.filter((nested) => nested !== range && within(nested, range)), ...types];
  // A token's type keeps an operand apart from an operator of the same text, such as a property named delete.
  const used = tokensWithin(ast.tokens, range)
    .filter((token) => !skip.some((skipped) => within(token.range, skipped)))
    .map((token) => `${token.type} ${token.value}`)
    .filter((token) => !closingBrackets.has(token));
  const length = used.length;
  const vocabulary = new Set(used).size;

  return { length, vocabulary, volume: length * Math.log2(vocabulary) };
}

/** The tokens inside `range`; the tokens are in source order and do not overlap. */
function tokensWithin(tokens: readonly TSESTree.Token[], [start, end]: Range): TSESTree.Token[] {
  const inside: TSESTree.Token[] = [];

  for (let index = firstAtOrAfter(tokens, start); index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === undefined || token.range[1] > end) {
      break;
    }

    inside.push(token);
  }

  return inside;
}

function within([start, end]: Range, [from, to]: Range): boolean {
  return start >= from && end <= to;
}

/** The index of the first token that starts at `offset` or later; the tokens are in source order. */
function firstAtOrAfter(tokens: readonly TSESTree.Token[], offset: number): number {
  let low = 0;
  let high = tokens.length;

  while (low < high) {
    const middle = (low + high) >>> 1;

    if ((tokens[middle]?.range[0] ?? offset) < offset) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}
