import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { builtInConstructors } from '../built-in-constructors.ts';
import { createRule } from '../create-rule.ts';

export const manualDispatch = createRule<[], 'found'>({
  name: 'manual-dispatch',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report an if chain that picks what to do by testing which class an object is',
      concept: 'Manual Dispatch',
      requiresTypeChecking: false,
      remedy: { kind: 'none', because: 'the message every class should answer is a design decision no tool can make' },
      tier: 'strict',
      skipsTestFiles: true,
    },
    messages: {
      found:
        "Stop and look: Manual Dispatch, this chain tests which class '{{subject}}' is to decide what to do. Look for " +
        'the message each branch would send instead. Cure: define the duck type, one message every one of these ' +
        'classes answers, so the code sends it without asking.',
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    return {
      IfStatement(node) {
        const { parent } = node;

        if (parent.type === AST_NODE_TYPES.IfStatement && parent.alternate === node) {
          return;
        }

        const subjects = chainOf(node).flatMap(({ test }) =>
          test.type === AST_NODE_TYPES.BinaryExpression && test.operator === 'instanceof' && !isErrorOrBuiltIn(test.right)
            ? [context.sourceCode.getText(test.left)]
            : [],
        );
        const subject = subjects.find((candidate, index) => subjects.indexOf(candidate) !== index);

        if (subject !== undefined) {
          context.report({ node, messageId: 'found', data: { subject } });
        }
      },
    };
  },
});

/**
 * Narrowing a caught error by its class is how JavaScript catches by type, and telling built-in values apart is
 * validation at a boundary: neither is a choice among the program's own classes.
 */
function isErrorOrBuiltIn(node: TSESTree.Expression): boolean {
  return node.type === AST_NODE_TYPES.Identifier && (node.name.endsWith('Error') || builtInConstructors.has(node.name));
}

/** The `if` and each `else if` that follows it. */
function chainOf(node: TSESTree.IfStatement): readonly TSESTree.IfStatement[] {
  const { alternate } = node;

  return alternate?.type === AST_NODE_TYPES.IfStatement ? [node, ...chainOf(alternate)] : [node];
}
