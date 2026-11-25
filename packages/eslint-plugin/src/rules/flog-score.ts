import { AST_NODE_TYPES as T, ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

type VisitorKeys = Readonly<Record<string, readonly string[] | undefined>>;

/** A child and the depth it adds to the multiplier. */
type Part = readonly [TSESTree.Node | null | undefined, number];

/** What one node adds, before its multiplier, and where its children sit; no parts means every child at its depth. */
interface Event {
  readonly a?: number;
  readonly b?: number;
  readonly c?: number;
  readonly parts?: readonly Part[];
}

const isNode = (value: unknown): value is TSESTree.Node =>
  typeof value === 'object' && value !== null && 'type' in value;

function childrenOf(node: TSESTree.Node, keys: VisitorKeys): TSESTree.Node[] {
  // Stryker disable next-line ArrayDeclaration: a key no node has yields no children, so a seeded fallback walks nothing
  return (keys[node.type] ?? []).flatMap((key) => {
    const value: unknown = Reflect.get(node, key);

    return [value].flat().filter(isNode);
  });
}

const isFunction = (node: TSESTree.Node): node is FunctionNode =>
  node.type === T.ArrowFunctionExpression || node.type === T.FunctionDeclaration || node.type === T.FunctionExpression;

/** A function passed straight to a call or `new`, which is scored into the function around it. */
function isCallback(node: TSESTree.Node): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
  const { parent } = node;

  return (
    isFunction(node) &&
    (parent?.type === T.CallExpression || parent?.type === T.NewExpression) &&
    parent.arguments.some((argument) => argument === node)
  );
}

const typeOnly = new Set<string>([
  T.TSTypeAnnotation,
  T.TSTypeParameterDeclaration,
  T.TSTypeParameterInstantiation,
  T.TSTypeAliasDeclaration,
  T.TSInterfaceDeclaration,
]);

function isTypeOnly(node: TSESTree.Node): boolean {
  const { parent } = node;
  const asserted =
    parent?.type === T.TSAsExpression || parent?.type === T.TSSatisfiesExpression || parent?.type === T.TSTypeAssertion;

  return typeOnly.has(node.type) || (asserted && parent.typeAnnotation === node);
}

const sends = new Set(['call', 'apply', 'bind']);
const reflection = new Set(['defineProperty', 'defineProperties', 'setPrototypeOf']);

/** Weights by name: dynamic evaluation 5, dynamic dispatch 3, reflection and `reduce` 2, any other call 1. */
function callWeight({ callee }: TSESTree.CallExpression | TSESTree.NewExpression): number {
  if (callee.type === T.Identifier) {
    if (callee.name === 'eval' || callee.name === 'Function') {
      return 5;
    }

    return callee.name === 'Proxy' ? 2 : 1;
  }

  if (callee.type !== T.MemberExpression) {
    return 1;
  }

  const name = callee.computed ? undefined : callee.property.name;
  const owner = callee.object.type === T.Identifier ? callee.object.name : undefined;

  if (name === undefined || sends.has(name)) {
    return 3;
  }

  return name === 'reduce' || owner === 'Reflect' || (owner === 'Object' && reflection.has(name)) ? 2 : 1;
}

/** A number literal other than 0 and -1, outside a `const` initializer. */
function isMagicNumber(node: TSESTree.Literal): boolean {
  const { parent } = node;

  if (typeof node.value !== 'number' || node.value === 0) {
    return false;
  }

  if (node.value === 1 && parent.type === T.UnaryExpression && parent.operator === '-') {
    return false;
  }

  // A literal right under a declarator is its initializer, since a declarator's name is never a literal.
  return !(parent.type === T.VariableDeclarator && parent.parent.kind === 'const');
}

/** Compound assignments that branch; every other compound assignment is arithmetic or bitwise. */
const logicalAssignment = new Set(['||=', '&&=', '??=']);

function callEvent(node: TSESTree.CallExpression | TSESTree.NewExpression): Event {
  const { callee } = node;
  const receiver: readonly Part[] =
    callee.type === T.MemberExpression
      ? [
          [callee.object, callee.optional ? 0.3 : 0.2],
          [callee.property, 0.2],
        ]
      : [[callee, 0]];
  const callbacks = node.arguments.filter(isCallback);
  const parts = node.arguments.map((argument): Part => (isCallback(argument) ? [argument.body, 0.1] : [argument, 0.2]));

  return { b: callbacks.length, c: callWeight(node), parts: [...receiver, ...parts] };
}

/** The Flog event of one node: its A, B and C weights and where its children sit. */
function eventOf(node: TSESTree.Node): Event {
  if (isFunction(node) || isTypeOnly(node)) {
    return { parts: [] };
  }

  switch (node.type) {
    case T.CallExpression:
    case T.NewExpression: {
      return callEvent(node);
    }
    case T.BlockStatement: {
      const deeper = node.body.length > 1 && !isFunction(node.parent) ? 0.1 : 0;

      return { parts: node.body.map((statement): Part => [statement, deeper]) };
    }
    case T.VariableDeclarator: {
      return { a: node.init === null ? 0 : 1 };
    }
    case T.UpdateExpression: {
      return { a: 1 };
    }
    case T.Literal: {
      return { c: isMagicNumber(node) ? 0.25 : 0 };
    }
    case T.AssignmentExpression: {
      if (node.operator !== '=' && !logicalAssignment.has(node.operator)) {
        return {
          a: 1,
          c: 1,
          parts: [
            [node.left, 0],
            [node.right, 0.2],
          ],
        };
      }

      return { a: 1, b: logicalAssignment.has(node.operator) ? 1 : 0 };
    }
    case T.BinaryExpression: {
      return {
        c: 1,
        parts: [
          [node.left, 0.2],
          [node.right, 0.2],
        ],
      };
    }
    default: {
      return branchEvent(node);
    }
  }
}

const branch = (level: readonly Part[0][], deeper: readonly Part[0][]): Event => ({
  b: 1,
  parts: [...level.map((child): Part => [child, 0]), ...deeper.map((child): Part => [child, 0.1])],
});

/** A branch counts B 1 and puts its bodies one step deeper; Flog's `else` of a `case` stays at the case's depth. */
function branchEvent(node: TSESTree.Node): Event {
  switch (node.type) {
    case T.IfStatement:
    case T.ConditionalExpression: {
      return branch([node.test], [node.consequent, node.alternate]);
    }
    case T.LogicalExpression: {
      return branch([], [node.left, node.right]);
    }
    case T.SwitchStatement: {
      return branch([node.discriminant], node.cases);
    }
    case T.SwitchCase: {
      return node.test === null ? {} : branch([node.test], node.consequent);
    }
    case T.WhileStatement:
    case T.DoWhileStatement: {
      return branch([], [node.test, node.body]);
    }
    case T.ForStatement: {
      return branch([node.init], [node.test, node.update, node.body]);
    }
    case T.ForInStatement:
    case T.ForOfStatement: {
      return branch([node.left, node.right], [node.body]);
    }
    case T.CatchClause: {
      return branch([node.param], [node.body]);
    }
    default: {
      return {};
    }
  }
}

function score(fn: FunctionNode, keys: VisitorKeys): { a: number; b: number; c: number } {
  const tally = { a: 0, b: 0, c: 0 };
  const walk = (node: TSESTree.Node, multiplier: number): void => {
    const { a = 0, b = 0, c = 0, parts } = eventOf(node);
    tally.a += a * multiplier;
    tally.b += b * multiplier;
    tally.c += c * multiplier;

    for (const [child, deeper] of parts ?? childrenOf(node, keys).map((child): Part => [child, 0])) {
      if (isNode(child)) {
        walk(child, multiplier + deeper);
      }
    }
  };

  for (const child of childrenOf(fn, keys)) {
    walk(child, 1);
  }

  return tally;
}

/**
 * Flog score of each function: Flog's weighted ABC, where an event deeper in the function weighs more, translated from
 * Ruby to JavaScript and TypeScript. A callback passed to a call counts toward the function around it.
 */
export const flogScore = createRule<Options, 'found'>({
  name: 'flog-score',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a function whose Flog score is above the limit',
      concept: 'Long Function',
      cures: ['Extract Function', 'Replace Nested Conditional with Guard Clauses', 'Decompose Conditional'],
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'recommended',
      strictOptions: [{ max: 15 }],
    },
    messages: {
      found:
        'Stop and look: Long Function, {{name}} has Flog score {{score}} (at most {{max}}) from weighted counts of ' +
        '{{a}} assignments, {{b}} branches and {{c}} calls; an event weighs more the deeper it is nested, and ' +
        'eval, dynamic dispatch and reflection weigh most. Cure: Extract Function for each nested step, Replace ' +
        'Nested Conditional with Guard Clauses, Decompose Conditional, or a named method in place of a dynamic call.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'number', minimum: 0 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ max: 25 }],
  },
  create(context, [{ max }]) {
    const { sourceCode } = context;

    return {
      ':function'(node: FunctionNode) {
        if (isCallback(node)) {
          return;
        }

        const { a, b, c } = score(node, sourceCode.visitorKeys);
        const total = Math.hypot(a, b, c);

        if (total > max) {
          const name = ASTUtils.getFunctionNameWithKind(node, sourceCode);
          const data = { name, score: total.toFixed(1), a: a.toFixed(1), b: b.toFixed(1), c: c.toFixed(1), max };

          context.report({ node, messageId: 'found', data });
        }
      },
    };
  },
});
