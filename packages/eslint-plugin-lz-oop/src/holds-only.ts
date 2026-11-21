import { AST_NODE_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { withoutTypeAssertions } from './without-type-assertions.ts';

/** One value a variable is given, as each expression that holds it: `a = this.c = make()` gives `this.c` and `make()`. */
type Value = readonly TSESTree.Expression[];

/**
 * Whether the variable is given at least one value and every value passes the test. The values are those its
 * declarations and its plain `=` assignments give it, without the type assertions that change only their static type.
 * A variable whose value comes from outside the function, as a parameter or a loop variable does, or that is written
 * any other way, holds values the rule cannot know, so it fails.
 */
export function holdsOnly(variable: TSESLint.Scope.Variable, test: (value: TSESTree.Expression) => boolean): boolean {
  const values = [
    ...variable.defs.flatMap(({ node }) => declaredValues(node)),
    ...variable.references.filter((reference) => reference.isWrite() && reference.init !== true).map(assignedValue),
  ];

  return values.length > 0 && values.every((value) => value?.some(test) === true);
}

function declaredValues(node: TSESLint.Scope.Definition['node']): (Value | undefined)[] {
  if (node.type !== AST_NODE_TYPES.VariableDeclarator || isLoopVariable(node)) {
    return [undefined];
  }

  return node.init ? [sameValue(node.init)] : [];
}

function isLoopVariable({ parent }: TSESTree.VariableDeclarator): boolean {
  return parent.parent.type === AST_NODE_TYPES.ForOfStatement || parent.parent.type === AST_NODE_TYPES.ForInStatement;
}

function assignedValue({ identifier }: TSESLint.Scope.Reference): Value | undefined {
  const { parent } = identifier;

  return parent.type === AST_NODE_TYPES.AssignmentExpression && parent.operator === '=' && parent.left === identifier
    ? sameValue(parent.right)
    : undefined;
}

function sameValue(expression: TSESTree.Expression): Value {
  const bare = withoutTypeAssertions(expression);

  return bare.type === AST_NODE_TYPES.AssignmentExpression && bare.operator === '='
    ? [bare.left, ...sameValue(bare.right)]
    : [bare];
}
