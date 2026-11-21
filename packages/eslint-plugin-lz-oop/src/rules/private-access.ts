import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import { createRule } from '../create-rule.ts';

type Options = [{ readonly underscore?: boolean }];

export const privateAccess = createRule<Options, 'found'>({
  name: 'private-access',
  meta: {
    type: 'suggestion',
    docs: {
      description: "Report code that reaches into another object's private member",
      concept: 'Inappropriate Intimacy',
      requiresTypeChecking: false,
      remedy: { kind: 'none', because: 'which public message serves the need is a design decision no tool can make' },
      tier: 'recommended',
      strictOptions: [{ underscore: true }],
    },
    messages: {
      found:
        "Stop and look: Inappropriate Intimacy, this reaches into the private member '{{member}}' of another object. " +
        'Look for why this code needs it. Cure: ask its class for a public message named for that need; only when none ' +
        'can exist, confine this access to one place. A test sends public messages and tests private code only while ' +
        "that code's design is unsettled, apart from the public tests; settled private code that needs tests may move " +
        'into a collaborator.',
    },
    schema: [
      {
        type: 'object',
        properties: { underscore: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ underscore: false }],
  },
  create(context, [{ underscore }]) {
    const { program, esTreeNodeToTSNodeMap } = context.sourceCode.parserServices ?? {};
    // A member TypeScript keeps from the top level of the file is private or protected.
    const nonPublicName = ({ object, property }: TSESTree.MemberExpression): string | undefined => {
      if (!program || !esTreeNodeToTSNodeMap || property.type !== AST_NODE_TYPES.Literal) {
        return undefined;
      }

      if (typeof property.value !== 'string') {
        return undefined;
      }

      const type = program.getTypeChecker().getTypeAtLocation(esTreeNodeToTSNodeMap.get(object));
      const isNonPublic = (declaration: ts.Declaration): boolean =>
        (ts.getCombinedModifierFlags(declaration) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) !== 0;

      return type.getProperty(property.value)?.declarations?.some(isNonPublic) === true ? property.value : undefined;
    };
    const underscoreName = ({ property }: TSESTree.MemberExpression): string | undefined =>
      underscore === true &&
      property.type === AST_NODE_TYPES.Identifier &&
      property.name.startsWith('_') &&
      !property.name.startsWith('__')
        ? property.name
        : undefined;

    return {
      MemberExpression(node) {
        if (
          node.object.type === AST_NODE_TYPES.ThisExpression ||
          node.object.type === AST_NODE_TYPES.Super ||
          namesEnclosingClass(node.object, context.sourceCode.getAncestors(node))
        ) {
          return;
        }

        const member = nonPublicName(node) ?? underscoreName(node);

        if (member !== undefined) {
          context.report({ node, messageId: 'found', data: { member } });
        }
      },
    };
  },
});

/** Whether the object is the name of a class that encloses the access, which then reaches its own static member. */
function namesEnclosingClass(object: TSESTree.Expression, ancestors: TSESTree.Node[]): boolean {
  return (
    object.type === AST_NODE_TYPES.Identifier &&
    ancestors.some(
      (ancestor) =>
        (ancestor.type === AST_NODE_TYPES.ClassDeclaration || ancestor.type === AST_NODE_TYPES.ClassExpression) &&
        ancestor.id?.name === object.name,
    )
  );
}
