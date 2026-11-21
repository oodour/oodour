import { AST_NODE_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { withoutTypeAssertions } from './without-type-assertions.ts';

/**
 * One value a variable is given. `expressions` are those that hold it, as `this.c` and `make()` both do in
 * `a = this.c = make()`, without the type assertions that change only their static type. `part` is set when a
 * destructuring pattern takes the variable's value out of them, so the variable holds a field or an element of theirs.
 */
export interface HeldValue {
  readonly expressions: readonly TSESTree.Expression[];
  readonly part: boolean;
}

/**
 * Whether the variable is given at least one value and every value passes the test. The values are those its
 * declarations, plain `=` assignments and logical assignments (`||=`, `&&=`, `??=`) give it. A variable whose value
 * comes from outside the function, as a parameter or a loop variable does, or that is written any other way, holds
 * values the rule cannot know, so it fails.
 */
export function holdsOnly(variable: TSESLint.Scope.Variable, test: (value: HeldValue) => boolean): boolean {
  const values: HeldValue[] = [];

  for (const { node } of variable.defs) {
    if (node.type !== AST_NODE_TYPES.VariableDeclarator || isLoopVariable(node)) {
      return false;
    }

    if (node.init) {
      values.push({ expressions: sameValue(node.init), part: node.id.type !== AST_NODE_TYPES.Identifier });
    }
  }

  for (const reference of variable.references) {
    if (reference.isWrite() && reference.init !== true) {
      const { parent } = reference.identifier;

      if (
        parent.type !== AST_NODE_TYPES.AssignmentExpression ||
        parent.left !== reference.identifier ||
        !givesItsValue(parent.operator)
      ) {
        return false;
      }

      values.push({ expressions: sameValue(parent.right), part: false });
    }
  }

  return values.length > 0 && values.every(test);
}

function isLoopVariable({ parent }: TSESTree.VariableDeclarator): boolean {
  return parent.parent.type === AST_NODE_TYPES.ForOfStatement || parent.parent.type === AST_NODE_TYPES.ForInStatement;
}

/** Whether the assignment leaves its target holding the right-hand value or the one it held. */
function givesItsValue(operator: TSESTree.AssignmentExpression['operator']): boolean {
  return operator === '=' || operator === '||=' || operator === '&&=' || operator === '??=';
}

/** The expressions that hold the value: an assignment's target holds it too, and a plain `=` also its right side. */
function sameValue(expression: TSESTree.Expression): TSESTree.Expression[] {
  const bare = withoutTypeAssertions(expression);

  if (bare.type !== AST_NODE_TYPES.AssignmentExpression) {
    return [bare];
  }

  return bare.operator === '=' ? [bare.left, ...sameValue(bare.right)] : [bare.left];
}
