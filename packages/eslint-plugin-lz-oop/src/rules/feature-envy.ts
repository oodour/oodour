import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { builtInConstructors } from '../built-in-constructors.ts';
import { createRule } from '../create-rule.ts';

/** How many more uses another object needs than the method's own object; a lead of one was mostly noise in the probe. */
const minimumLead = 2;

export const featureEnvy = createRule<[], 'found'>({
  name: 'feature-envy',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a method that uses another object more than its own',
      concept: 'Feature Envy',
      requiresTypeChecking: false,
      remedy: { kind: 'none', because: 'which class should own the behaviour is a design decision no tool can make' },
      tier: 'strict',
      skipsTestFiles: true,
    },
    messages: {
      found:
        "Stop and look: Feature Envy, this method uses '{{name}}' {{count}} times and its own object {{own}}. Look for " +
        "what it asks of '{{name}}'. Cure: Move Function, often to the class of '{{name}}', with Extract Function " +
        'first when only part of the method envies; when it draws on several objects about equally, a new object may ' +
        "own that behaviour. Leave it where it is when this object plays a role, such as a strategy or visitor, that " +
        "'{{name}}' hands itself to.",
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    const methods: { node: TSESTree.MethodDefinition; own: number; uses: Map<TSESLint.Scope.Variable, number> }[] = [];
    const localVariable = (
      method: TSESTree.MethodDefinition,
      name: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | undefined => {
      const variable = ASTUtils.findVariable(context.sourceCode.getScope(name), name);
      return variable?.scope.variableScope.block === method.value ? variable : undefined;
    };

    return {
      MethodDefinition(node) {
        methods.push({ node, own: 0, uses: new Map() });
      },
      'ThisExpression, Super'() {
        const method = methods.at(-1);

        if (method) {
          method.own += 1;
        }
      },
      MemberExpression(node) {
        const method = methods.at(-1);
        const object = withoutTypeAssertions(node.object);
        const variable =
          method && object.type === AST_NODE_TYPES.Identifier ? localVariable(method.node, object) : undefined;

        if (!method || !variable || isTemporary(variable)) {
          return;
        }

        if (holdsOwnField(variable)) {
          method.own += 1;
        } else {
          method.uses.set(variable, (method.uses.get(variable) ?? 0) + 1);
        }
      },
      'MethodDefinition:exit'(node: TSESTree.MethodDefinition) {
        const method = methods.pop();

        if (!method || node.static || method.own === 0) {
          return;
        }

        // A spread of every count would pass one argument per local and overflow the stack in generated code.
        const most = [...method.uses.values()].reduce((highest, count) => Math.max(highest, count), 0);

        [...method.uses]
          .filter(([, count]) => count === most && count - method.own >= minimumLead)
          .forEach(([variable, count]) => {
            context.report({ node, messageId: 'found', data: { name: variable.name, count, own: method.own } });
          });
      },
    };
  },
});

/** Whether the variable holds a built-in collection or a literal the method creates for its own work. */
function isTemporary(variable: TSESLint.Scope.Variable): boolean {
  return initializersOf(variable).some(
    (init) =>
      init.type === AST_NODE_TYPES.ArrayExpression ||
      init.type === AST_NODE_TYPES.ObjectExpression ||
      (init.type === AST_NODE_TYPES.NewExpression &&
        init.callee.type === AST_NODE_TYPES.Identifier &&
        builtInConstructors.has(init.callee.name)),
  );
}

/** Whether the variable holds its own object or one of its fields, as in `const cache = this.cache` or `{ a } = this`. */
function holdsOwnField(variable: TSESLint.Scope.Variable): boolean {
  return initializersOf(variable).some(
    (init) =>
      init.type === AST_NODE_TYPES.ThisExpression ||
      (init.type === AST_NODE_TYPES.MemberExpression && init.object.type === AST_NODE_TYPES.ThisExpression),
  );
}

/** The values the variable's declarators give it, without the type assertions that change only their static type. */
function initializersOf(variable: TSESLint.Scope.Variable): TSESTree.Expression[] {
  return variable.defs.flatMap(({ node }) =>
    node.type === AST_NODE_TYPES.VariableDeclarator && node.init ? [withoutTypeAssertions(node.init)] : [],
  );
}

function withoutTypeAssertions(expression: TSESTree.Expression): TSESTree.Expression {
  return expression.type === AST_NODE_TYPES.TSAsExpression ||
    expression.type === AST_NODE_TYPES.TSSatisfiesExpression ||
    expression.type === AST_NODE_TYPES.TSNonNullExpression ||
    expression.type === AST_NODE_TYPES.TSTypeAssertion
    ? withoutTypeAssertions(expression.expression)
    : expression;
}
