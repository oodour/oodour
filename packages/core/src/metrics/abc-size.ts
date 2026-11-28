import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';
import { defineMetric } from '../metric.ts';
import type { Position } from '../units.ts';

/** The three counts of one function. The size is their vector length, `Math.hypot(a, b, c)`. */
export interface AbcCounts {
  readonly assignments: number;
  readonly sends: number;
  readonly conditions: number;
}

const comparisons = new Set(['==', '===', '!=', '!==', '<', '>', '<=', '>=']);
const logicalAssignment = new Set(['&&=', '||=', '??=']);
const tested = new Set<string>([
  AST_NODE_TYPES.IfStatement,
  AST_NODE_TYPES.ConditionalExpression,
  AST_NODE_TYPES.WhileStatement,
  AST_NODE_TYPES.DoWhileStatement,
  AST_NODE_TYPES.ForStatement,
]);
const branching = new Set<string>([AST_NODE_TYPES.IfStatement, AST_NODE_TYPES.ConditionalExpression]);

/**
 * ABC size: assignments, sends (calls and `new`) and conditions, per function; a nested function's counts are its own.
 * Conditions are the constructs 99 Bottles of OOP scores, then the ones it never scores, counted as RuboCop's
 * Metrics/AbcSize does. A node that is two kinds of condition (`p && q` as an `if` test) counts twice.
 */
export const abcSize = defineMetric({
  name: 'abc-size',
  needs: 'syntax',
  units: ['function'],
  open: () => ({ assignments: 0, sends: 0, conditions: 0 }),
  enter: (node, counts, at) => {
    counts.assignments += isAssignment(node) ? 1 : 0;
    counts.sends += node.type === AST_NODE_TYPES.CallExpression || node.type === AST_NODE_TYPES.NewExpression ? 1 : 0;
    counts.conditions += conditionsOf(node, at);
  },
  close: (counts): AbcCounts => counts,
});

function isAssignment(node: TSESTree.Node): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.VariableDeclarator: {
      return node.init !== null;
    }

    case AST_NODE_TYPES.AssignmentExpression:
    case AST_NODE_TYPES.UpdateExpression: {
      return true;
    }

    default: {
      return false;
    }
  }
}

function conditionsOf(node: TSESTree.Node, { parent, key }: Position): number {
  const comparison = isComparison(node);
  const fromPosition =
    (key === 'test' && parent !== undefined && tested.has(parent.type) && !comparison ? 1 : 0) +
    (key === 'alternate' && parent !== undefined && branching.has(parent.type) && node.type !== AST_NODE_TYPES.IfStatement
      ? 1
      : 0);

  return (comparison ? 1 : 0) + fromPosition + conditionsOfType(node);
}

function isComparison(node: TSESTree.Node): boolean {
  return node.type === AST_NODE_TYPES.BinaryExpression && comparisons.has(node.operator);
}

function conditionsOfType(node: TSESTree.Node): number {
  switch (node.type) {
    case AST_NODE_TYPES.SwitchCase:
    case AST_NODE_TYPES.LogicalExpression:
    case AST_NODE_TYPES.ForInStatement:
    case AST_NODE_TYPES.ForOfStatement:
    case AST_NODE_TYPES.CatchClause: {
      return 1;
    }

    case AST_NODE_TYPES.AssignmentExpression: {
      return logicalAssignment.has(node.operator) ? 1 : 0;
    }

    case AST_NODE_TYPES.MemberExpression:
    case AST_NODE_TYPES.CallExpression: {
      return node.optional ? 1 : 0;
    }

    default: {
      return 0;
    }
  }
}
