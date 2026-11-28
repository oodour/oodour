import {
  AST_NODE_TYPES as T,
  type TSESTree,
} from '@typescript-eslint/typescript-estree';
import { defineMetric } from '../metric.ts';
import type { ExistingTypes } from '../source.ts';

/** A chain of member accesses and the number of distinct types it steps through. */
export interface TypeHoppingChain {
  readonly node: TSESTree.MemberExpression;
  readonly count: number;
}

/**
 * The chains in each file that step through two or more distinct types: the Law of Demeter by types rather than dots,
 * so a fluent pipeline on one array type has nothing to report, while a walk from an order through its customer to an
 * address does. Needs the program's types, so only a typed source takes it.
 */
export const typeHoppingChain = defineMetric({
  name: 'type-hopping-chain',
  needs: 'types',
  units: ['file'],
  open: (): TypeHoppingChain[] => [],
  enter(node, chains, _at, { types }) {
    if (node.type !== T.MemberExpression || !isOutermost(node)) {
      return;
    }

    const count = new Set(
      receiversOf(node).map((receiver) => typeName(receiver, types)),
    ).size;

    if (count > 1) {
      chains.push({ node, count });
    }
  },
  close: (chains): readonly TypeHoppingChain[] | undefined =>
    chains.length > 0 ? chains : undefined,
});

function typeName(
  receiver: TSESTree.Node,
  { program, esTreeNodeToTSNodeMap }: ExistingTypes,
): string {
  const checker = program.getTypeChecker();

  return checker.typeToString(
    checker.getApparentType(
      checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(receiver)),
    ),
  );
}

/** True unless the access continues the chain: as the object of a member access, or as a called method that does. */
function isOutermost(node: TSESTree.MemberExpression): boolean {
  const { parent } = node;

  if (parent.type === T.MemberExpression && parent.object === node) {
    return false;
  }

  return !(
    parent.type === T.CallExpression &&
    parent.callee === node &&
    parent.parent.type === T.MemberExpression
  );
}

/** The object of each member access along the chain, outermost first, leaving out `this`. */
function receiversOf(
  chain: TSESTree.MemberExpression,
): readonly TSESTree.Node[] {
  const receivers: TSESTree.Node[] = [];
  let current: TSESTree.Node = chain;

  while (
    current.type === T.MemberExpression ||
    current.type === T.CallExpression
  ) {
    const inner: TSESTree.Node =
      current.type === T.MemberExpression ? current.object : current.callee;

    if (
      current.type === T.MemberExpression &&
      inner.type !== T.ThisExpression
    ) {
      receivers.push(inner);
    }

    current = inner;
  }

  return receivers;
}
