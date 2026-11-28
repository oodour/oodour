import {
  AST_NODE_TYPES,
  type TSESTree,
} from '@typescript-eslint/typescript-estree';
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

interface Ranged {
  readonly range: Range;
}

/**
 * What a file's functions leave out of their counts: every function, and the type-only syntax. Both in the order of
 * the walk, which is source order, so a function finds the ones inside it by a binary search.
 */
interface Skipped {
  readonly functions: Ranged[];
  readonly types: Ranged[];
}

// A nested function opens its own unit before the walk enters it, so its enclosing function never sees the node: each
// function files its range here, and the functions around it read it back when they close.
const skippedBySource = new WeakMap<Source, Skipped>();

// A closing bracket belongs to its opening one, which is counted.
const closingBrackets = new Set([
  'Punctuator )',
  'Punctuator ]',
  'Punctuator }',
]);
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
  needs: 'syntax',
  units: ['function'],
  open: ({ node }, source): Skipped => {
    const skipped = skippedBySource.get(source) ?? { functions: [], types: [] };

    skippedBySource.set(source, skipped);
    skipped.functions.push(node);

    return skipped;
  },
  enter(node, skipped, at) {
    if (isTypeOnly(node, at)) {
      skipped.types.push(node);
    }
  },
  close: (skipped, { node }, source): HalsteadCounts =>
    countsOf(node.range, skipped, source),
});

function isTypeOnly(node: TSESTree.Node, { parent, key }: Position): boolean {
  // Stryker disable ConditionalExpression: every other typeAnnotation key sits inside a node already type-only
  return (
    typeOnly.has(node.type) ||
    (parent !== undefined &&
      typeAssertions.has(parent.type) &&
      key === 'typeAnnotation')
  );
}

// Stryker restore ConditionalExpression
function countsOf(
  range: Range,
  { functions, types }: Skipped,
  { ast, file }: Source,
): HalsteadCounts {
  if (ast.tokens === undefined) {
    throw new Error(
      `halstead-volume needs the tokens of ${file}, which its parse left out.`,
    );
  }

  const skip = [
    ...within(functions, range).filter((nested) => nested.range !== range),
    ...within(types, range),
  ];
  // A token's type keeps an operand apart from an operator of the same text, such as a property named delete.
  const used = within(ast.tokens, range)
    .filter(
      ({ range: [start, end] }) =>
        !skip.some(({ range: [from, to] }) => start >= from && end <= to),
    )
    .map((token) => `${token.type} ${token.value}`)
    .filter((token) => !closingBrackets.has(token));
  const length = used.length;
  const vocabulary = new Set(used).size;

  return { length, vocabulary, volume: length * Math.log2(vocabulary) };
}

/**
 * The items inside `range`. The items are tokens or nodes in source order: one that starts inside the range of a
 * function ends inside it too, so the first that ends past it is past it.
 */
function within<TItem extends Ranged>(
  items: readonly TItem[],
  [start, end]: Range,
): TItem[] {
  const inside: TItem[] = [];

  for (
    let index = firstAtOrAfter(items, start);
    // Stryker disable next-line EqualityOperator: past the last item the index reads undefined, which ends the loop too
    index < items.length;
    index += 1
  ) {
    const item = items[index];

    if (item === undefined || item.range[1] > end) {
      break;
    }

    inside.push(item);
  }

  return inside;
}

/** The index of the first item that starts at `offset` or later; the items are in source order. */
function firstAtOrAfter(items: readonly Ranged[], offset: number): number {
  let low = 0;
  let high = items.length;

  while (low < high) {
    const middle = (low + high) >>> 1;

    if ((items[middle]?.range[0] ?? offset) < offset) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}
