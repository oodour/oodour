import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';

/** The expression without the type assertions around it, which change only its static type. */
export function withoutTypeAssertions(expression: TSESTree.Expression): TSESTree.Expression {
  return expression.type === AST_NODE_TYPES.TSAsExpression ||
    expression.type === AST_NODE_TYPES.TSSatisfiesExpression ||
    expression.type === AST_NODE_TYPES.TSNonNullExpression ||
    expression.type === AST_NODE_TYPES.TSTypeAssertion
    ? withoutTypeAssertions(expression.expression)
    : expression;
}
