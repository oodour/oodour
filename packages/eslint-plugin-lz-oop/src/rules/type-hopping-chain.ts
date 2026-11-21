import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';

type Options = [{ readonly maxInterfaces: number }];

/** True unless the access continues the chain: as the object of a member access, or as a called method that does. */
function isOutermost(node: TSESTree.MemberExpression): boolean {
  const { parent } = node;

  if (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === node) {
    return false;
  }

  return !(
    parent.type === AST_NODE_TYPES.CallExpression &&
    parent.callee === node &&
    parent.parent.type === AST_NODE_TYPES.MemberExpression
  );
}

/** The object of each member access along the chain, outermost first, leaving out `this`. */
function receiversOf(chain: TSESTree.MemberExpression): readonly TSESTree.Node[] {
  const receivers: TSESTree.Node[] = [];
  let current: TSESTree.Node = chain;

  while (current.type === AST_NODE_TYPES.MemberExpression || current.type === AST_NODE_TYPES.CallExpression) {
    const inner: TSESTree.Node = current.type === AST_NODE_TYPES.MemberExpression ? current.object : current.callee;

    if (current.type === AST_NODE_TYPES.MemberExpression && inner.type !== AST_NODE_TYPES.ThisExpression) {
      receivers.push(inner);
    }

    current = inner;
  }

  return receivers;
}

/**
 * Law of Demeter by the number of distinct types a chain steps through, not by dots: a fluent pipeline on one array
 * type passes, a walk from an order through its customer to an address does not.
 */
export const typeHoppingChain = createRule<Options, 'chain'>({
  name: 'type-hopping-chain',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a chain that steps through more distinct types than allowed',
      concept: 'Message Chains',
      cures: ['Hide Delegate'],
      requiresTypeChecking: true,
      remedy: {
        kind: 'none',
        because:
          'the cure adds a delegating method to the nearest object, whose class usually lives in another file; a codemod for it is planned',
      },
      tier: 'strict',
    },
    messages: {
      chain:
        'Stop and look: Message Chains, this chain steps through {{count}} different types against the Law of ' +
        'Demeter, so it breaks when any of them changes. Look for what the chain is after. Cure: Hide Delegate, a method on the nearest object named ' +
        'for that goal.',
    },
    schema: [
      {
        type: 'object',
        properties: { maxInterfaces: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ maxInterfaces: 2 }],
  },
  create(context, [{ maxInterfaces }]) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const typeName = (receiver: TSESTree.Node): string =>
      checker.typeToString(checker.getApparentType(services.getTypeAtLocation(receiver)));

    return {
      MemberExpression(node) {
        if (!isOutermost(node)) {
          return;
        }

        const seen = new Set(receiversOf(node).map(typeName));

        if (seen.size > maxInterfaces) {
          context.report({ node, messageId: 'chain', data: { count: String(seen.size) } });
        }
      },
    };
  },
});
