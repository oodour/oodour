import { AST_NODE_TYPES, ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import { createRule } from '../create-rule.ts';
import { withoutTypeAssertions } from '../without-type-assertions.ts';

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
      defaultsNeedTypes: true,
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
    // The compiler lets a class read another instance's private members through a dot, and any code read them
    // through brackets with a string key.
    const nonPublicName = ({ object, property, computed }: TSESTree.MemberExpression): string | undefined => {
      const name =
        !computed && property.type === AST_NODE_TYPES.Identifier
          ? property.name
          : property.type === AST_NODE_TYPES.Literal && typeof property.value === 'string'
            ? property.value
            : undefined;

      if (!program || !esTreeNodeToTSNodeMap || name === undefined) {
        return undefined;
      }

      const checker = program.getTypeChecker();
      const type = checker.getNonNullableType(checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(object)));
      const isNonPublic = (declaration: ts.Declaration): boolean =>
        (ts.getCombinedModifierFlags(declaration) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) !== 0;

      return (type.isUnion() ? type.types : [type]).some(
        (member) => member.getProperty(name)?.declarations?.some(isNonPublic) === true,
      )
        ? name
        : undefined;
    };
    const underscoreName = ({ computed, property }: TSESTree.MemberExpression): string | undefined =>
      underscore === true &&
      !computed &&
      property.type === AST_NODE_TYPES.Identifier &&
      property.name.startsWith('_') &&
      !property.name.startsWith('__')
        ? property.name
        : undefined;

    const isOwnObject = (object: TSESTree.Expression): boolean => {
      const bare = withoutTypeAssertions(object);
      const variable =
        bare.type === AST_NODE_TYPES.Identifier
          ? ASTUtils.findVariable(context.sourceCode.getScope(bare), bare)
          : undefined;

      return (
        bare.type === AST_NODE_TYPES.ThisExpression ||
        bare.type === AST_NODE_TYPES.Super ||
        // Stryker disable next-line MethodExpression: a local that holds this has one definition, so some and every agree
        (variable?.defs.some(
          ({ node }) =>
            node.type === AST_NODE_TYPES.VariableDeclarator &&
            node.init !== null &&
            withoutTypeAssertions(node.init).type === AST_NODE_TYPES.ThisExpression,
        ) ??
          false)
      );
    };

    return {
      MemberExpression(node) {
        if (isOwnObject(node.object)) {
          return;
        }

        const member = nonPublicName(node) ?? underscoreName(node);

        if (member !== undefined && !namesEnclosingClass(node.object, context.sourceCode.getAncestors(node))) {
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
    ancestors.some((ancestor) => classNameOf(ancestor) === object.name)
  );
}

/** A class's own name, or for an unnamed class expression the name of the variable that holds it. */
function classNameOf(node: TSESTree.Node): string | undefined {
  if (node.type === AST_NODE_TYPES.ClassDeclaration || node.type === AST_NODE_TYPES.ClassExpression) {
    const holder = node.parent;

    return (
      node.id?.name ??
      (holder.type === AST_NODE_TYPES.VariableDeclarator && holder.id.type === AST_NODE_TYPES.Identifier
        ? holder.id.name
        : undefined)
    );
  }

  return undefined;
}
