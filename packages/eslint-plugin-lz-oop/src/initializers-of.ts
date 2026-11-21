import { AST_NODE_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { withoutTypeAssertions } from './without-type-assertions.ts';

/**
 * The values the variable's declarators give it, without the type assertions that change only their static type, or
 * none when a later assignment replaces them.
 */
export function initializersOf(variable: TSESLint.Scope.Variable): TSESTree.Expression[] {
  if (variable.references.some((reference) => reference.isWrite() && reference.init !== true)) {
    return [];
  }

  return variable.defs.flatMap(({ node }) =>
    node.type === AST_NODE_TYPES.VariableDeclarator && node.init ? [withoutTypeAssertions(node.init)] : [],
  );
}
