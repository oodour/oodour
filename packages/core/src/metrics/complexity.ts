import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';
import { defineMetric } from '../metric.ts';

const logicalAssignment = new Set(['&&=', '||=', '??=']);

/** Cyclomatic complexity as ESLint's `complexity` rule counts it (the classic variant), held there by a differential test. */
export const complexity = defineMetric({
  name: 'complexity',
  needs: 'syntax',
  units: ['function', 'field-initializer', 'static-block'],
  open: () => ({ paths: 1 }),
  enter: (node, state) => {
    state.paths += pathsAdded(node);
  },
  close: ({ paths }) => paths,
});

function pathsAdded(node: TSESTree.Node): number {
  switch (node.type) {
    case AST_NODE_TYPES.CatchClause:
    case AST_NODE_TYPES.ConditionalExpression:
    case AST_NODE_TYPES.LogicalExpression:
    case AST_NODE_TYPES.ForStatement:
    case AST_NODE_TYPES.ForInStatement:
    case AST_NODE_TYPES.ForOfStatement:
    case AST_NODE_TYPES.IfStatement:
    case AST_NODE_TYPES.WhileStatement:
    case AST_NODE_TYPES.DoWhileStatement:
    case AST_NODE_TYPES.AssignmentPattern: {
      return 1;
    }

    case AST_NODE_TYPES.SwitchCase: {
      return node.test === null ? 0 : 1;
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
