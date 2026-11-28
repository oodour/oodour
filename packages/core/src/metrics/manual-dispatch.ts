import {
  AST_NODE_TYPES,
  type TSESTree,
} from '@typescript-eslint/typescript-estree';
import { builtInConstructors } from '../built-in-constructors.ts';
import { defineMetric } from '../metric.ts';

/** An if chain that tests the class of one subject more than once. */
export interface ManualDispatch {
  /** The chain's first `if`. */
  readonly node: TSESTree.IfStatement;
  /** The source text left of `instanceof` that the chain tests twice or more; the first such text in the chain. */
  readonly subject: string;
}

/**
 * The if chains of a file, an `if` with each `else if` after it, that test with `instanceof` which class the same
 * subject is in two branches or more. A test for an error class or a built-in class does not count.
 */
export const manualDispatch = defineMetric({
  name: 'manual-dispatch',
  needs: 'syntax',
  units: ['file'],
  open: (): ManualDispatch[] => [],
  enter(node, dispatches, { key }, { text }) {
    // Only an `if` has an `alternate` slot that can hold an `if`, so the node is an `else if`.
    if (node.type !== AST_NODE_TYPES.IfStatement || key === 'alternate') {
      return;
    }

    const subjects = chainOf(node).flatMap(({ test }) =>
      test.type === AST_NODE_TYPES.BinaryExpression &&
      test.operator === 'instanceof' &&
      !isErrorOrBuiltIn(test.right)
        ? [text.slice(...test.left.range)]
        : [],
    );
    const subject = subjects.find(
      (candidate, index) => subjects.indexOf(candidate) !== index,
    );

    if (subject !== undefined) {
      dispatches.push({ node, subject });
    }
  },
  close: (dispatches): readonly ManualDispatch[] | undefined =>
    dispatches.length === 0 ? undefined : dispatches,
});

/**
 * Narrowing a caught error by its class is how JavaScript catches by type, and telling built-in values apart is
 * validation at a boundary: neither is a choice among the program's own classes.
 */
function isErrorOrBuiltIn(node: TSESTree.Expression): boolean {
  return (
    node.type === AST_NODE_TYPES.Identifier &&
    (node.name.endsWith('Error') || builtInConstructors.has(node.name))
  );
}

/** The `if` and each `else if` that follows it. */
function chainOf(node: TSESTree.IfStatement): readonly TSESTree.IfStatement[] {
  const { alternate } = node;

  return alternate?.type === AST_NODE_TYPES.IfStatement
    ? [node, ...chainOf(alternate)]
    : [node];
}
