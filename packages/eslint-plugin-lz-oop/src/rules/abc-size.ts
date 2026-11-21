import { ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

interface Counts {
  a: number;
  b: number;
  c: number;
}

const comparison = 'BinaryExpression[operator=/^([=!]==?|[<>]=?)$/]';
const assignments = ['VariableDeclarator[init!=null]', 'AssignmentExpression', 'UpdateExpression'];
const sends = ['CallExpression', 'NewExpression'];
// Constructs 99 Bottles of OOP scores, then the ones it never scores, counted as RuboCop's Metrics/AbcSize does.
const conditions = [
  comparison,
  `:matches(IfStatement, ConditionalExpression, WhileStatement, DoWhileStatement, ForStatement) > :not(${comparison}).test`,
  ':matches(IfStatement, ConditionalExpression) > :not(IfStatement).alternate',
  'SwitchCase',
  'LogicalExpression',
  'AssignmentExpression[operator=/^(\\|\\||&&|\\?\\?)=$/]',
  'ForInStatement',
  'ForOfStatement',
  'CatchClause',
  ':matches(MemberExpression, CallExpression)[optional=true]',
];

/**
 * ABC size as 99 Bottles of OOP counts it: assignments, sends (calls and `new`) and conditions, combined as the length
 * of the vector. Each function is scored alone; a nested function's counts are its own.
 */
export const abcSize = createRule<Options, 'found'>({
  name: 'abc-size',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a function whose ABC size is above the limit',
      concept: 'Long Function',
      cures: [
        'Extract Function',
        'Replace Temp with Query',
        'Inline Variable',
        'Decompose Conditional',
        'Replace Conditional with Polymorphism',
      ],
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'recommended',
      strictOptions: [{ max: 10 }],
    },
    messages: {
      found:
        'Stop and look: Long Function, {{name}} has ABC size {{size}} (at most {{max}}) from {{a}} assignments, ' +
        '{{b}} sends and {{c}} conditions, more than a reader holds at once. Look at the largest count: ' +
        'assignments are often temporaries, sends are steps or collaborators, conditions are choices. Cure: Extract ' +
        'Function for each step, Replace Temp with Query or Inline Variable, Decompose Conditional, or Replace ' +
        'Conditional with Polymorphism.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'number', minimum: 0 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ max: 15 }],
  },
  create(context, [{ max }]) {
    const stack: Counts[] = [];
    const add =
      (key: keyof Counts) =>
      (): void => {
        const top = stack.at(-1);

        if (top !== undefined) {
          top[key] += 1;
        }
      };

    return {
      ':function'() {
        stack.push({ a: 0, b: 0, c: 0 });
      },
      ':function:exit'(node: FunctionNode) {
        // Stryker disable next-line LzJsNumericLiteral: every function's exit follows the entry that pushed its counts, so the fallback never runs
        const { a, b, c } = stack.pop() ?? { a: 0, b: 0, c: 0 };
        const size = Math.hypot(a, b, c);

        if (size > max) {
          const name = ASTUtils.getFunctionNameWithKind(node, context.sourceCode);

          context.report({ node, messageId: 'found', data: { name, size: size.toFixed(1), a, b, c, max } });
        }
      },
      // One listener per selector: a node that two selectors match, such as `p && q` as an if test, counts twice.
      ...Object.fromEntries(assignments.map((selector) => [selector, add('a')])),
      ...Object.fromEntries(sends.map((selector) => [selector, add('b')])),
      ...Object.fromEntries(conditions.map((selector) => [selector, add('c')])),
    };
  },
});
