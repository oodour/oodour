import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { visitorKeys } from '@typescript-eslint/visitor-keys';
import esquery from 'esquery';
import { defineMetric, type Metric } from '../metric.ts';

type EstreeNode = Parameters<typeof esquery.match>[0];

/**
 * A metric of the nodes in each file that any of the esquery selectors matches, as an ESLint rule with a listener per
 * selector reports them: selector by selector, each in the order of the walk, so a node two selectors match is there
 * twice. Throws for a selector that puts a child step in `:has(> ...)`, which esquery 1.7 silently matches nothing for
 * once the step is longer than one node.
 */
export function defineSelectorMetric(
  name: string,
  selectors: readonly [string, ...string[]],
): Metric<readonly TSESTree.Node[], 'file'> {
  const childStepInHas = selectors.find((selector) => /:has\(\s*>/.test(selector));

  if (childStepInHas !== undefined) {
    throw new Error(
      `${name}: "${childStepInHas}" puts a child step in :has(> ...), which esquery 1.7 silently matches nothing for once the step is longer than one node; use a descendant or sibling (~) form.`,
    );
  }

  const parsed = selectors.map((selector) => esquery.parse(selector));

  return defineMetric({
    name,
    units: ['file'],
    open: () => undefined,
    close: (_state, { node }): readonly TSESTree.Node[] | undefined => {
      if (!isEstreeNode(node)) {
        return undefined;
      }

      const matches = parsed.flatMap((selector) =>
        // Stryker disable next-line ObjectLiteral: without the keys esquery iterates each node's own keys and reaches the same nodes
        esquery.match(node, selector, { visitorKeys: keys }).flatMap((match: unknown) => (isTreeNode(match) ? [match] : [])),
      );

      return matches.length > 0 ? matches : undefined;
    },
  });
}

// esquery's types describe ESTree nodes and typescript-estree's describe its superset; at run time both are the same
// objects, which esquery reads only by their `type` and the visitor keys.
function isEstreeNode(value: object): value is EstreeNode {
  // Stryker disable next-line ConditionalExpression: true for every node of a parsed tree; the check carries the type across
  return 'type' in value && typeof value.type === 'string' && Object.hasOwn(keys, value.type);
}

function isTreeNode(value: unknown): value is TSESTree.Node {
  // Stryker disable next-line ConditionalExpression: true for every match esquery returns; the check carries the type across
  return typeof value === 'object' && value !== null && isEstreeNode(value);
}

/** The visitor keys of every node type, without the entries the map's type allows to be missing. */
const keys = Object.fromEntries(
  Object.entries(visitorKeys).flatMap(([type, nodeKeys]) => (nodeKeys === undefined ? [] : [[type, nodeKeys] as const])),
);
