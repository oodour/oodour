import { builtInConstructors } from '@oodour/core';
import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type ts from 'typescript';
import { createRule } from '../create-rule.ts';
import { holdsOnly } from '../holds-only.ts';
import { withoutTypeAssertions } from '../without-type-assertions.ts';

/**
 * How many more uses another object needs than the method's own object. Reek reports any lead, but on real code a lead
 * of one was mostly noise: about 15% of those reports were true, and every lead-of-one report sampled was weak or false.
 */
const minimumLead = 2;

export const featureEnvy = createRule<[], 'found'>({
  name: 'feature-envy',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a method that uses another object more than its own',
      concept: 'Feature Envy',
      cures: ['Move Function', 'Extract Function'],
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
    const { program, esTreeNodeToTSNodeMap } = context.sourceCode.parserServices ?? {};
    const cannotTakeAMove = (variable: TSESLint.Scope.Variable): boolean => {
      const [definition] = variable.defs;

      if (!program || !esTreeNodeToTSNodeMap || !definition) {
        return false;
      }

      const checker = program.getTypeChecker();
      const type = checker.getNonNullableType(checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(definition.name)));
      const outsideTheProject = (member: ts.Type): boolean => {
        const declarations = checker.getPropertiesOfType(member).flatMap((property) => property.declarations ?? []);

        return (
          declarations.length > 0 &&
          declarations.every(
            (declaration) =>
              program.isSourceFileDefaultLibrary(declaration.getSourceFile()) ||
              declaration.getSourceFile().fileName.includes('/node_modules/'),
          )
        );
      };

      return (type.isUnion() ? type.types : [type]).every(outsideTheProject);
    };
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

        if (!method || !variable) {
          return;
        }

        // The types only drop a variable that would be envied; an own field of any type still counts as own.
        if (holdsOwnField(variable)) {
          method.own += 1;
        } else if (!isTemporary(variable) && !cannotTakeAMove(variable)) {
          method.uses.set(variable, (method.uses.get(variable) ?? 0) + 1);
        }
      },
      'MethodDefinition:exit'(node: TSESTree.MethodDefinition) {
        const method = methods.pop();

        if (!method || node.static || method.own === 0) {
          return;
        }

        // A spread of every count would pass one argument per local and overflow the stack in generated code.
        // Stryker disable next-line LzJsNumericLiteral: every count is at least 1, so a start of 1 or below finds the same highest count
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

/**
 * Whether the variable holds a built-in collection or a literal the method creates for its own work, or such a value
 * in place of its own field, as in `let batch = this.batch; batch ??= []`.
 */
function isTemporary(variable: TSESLint.Scope.Variable): boolean {
  return holdsOnly(
    variable,
    ({ expressions, part }) => !part && expressions.some((value) => createsScratch(value) || isOwnField(value)),
  );
}

/** Whether the value is an object literal or a built-in collection made here. */
function createsScratch(init: TSESTree.Expression): boolean {
  return init.type === AST_NODE_TYPES.ObjectExpression || createsCollection(init);
}

/**
 * Whether the value is a built-in collection made here, alone or as the right side of `??`, `||` or `&&`. An object
 * literal on the right says nothing about the type of the left, so it does not count there.
 */
function createsCollection(init: TSESTree.Expression): boolean {
  return (
    init.type === AST_NODE_TYPES.ArrayExpression ||
    (init.type === AST_NODE_TYPES.NewExpression &&
      init.callee.type === AST_NODE_TYPES.Identifier &&
      builtInConstructors.has(init.callee.name)) ||
    (init.type === AST_NODE_TYPES.LogicalExpression && createsCollection(withoutTypeAssertions(init.right)))
  );
}

/**
 * Whether the variable holds its own object or one of its fields, as in `const cache = this.cache` or `{ a } = this`,
 * or is a constructor parameter property, which is a field.
 */
function holdsOwnField(variable: TSESLint.Scope.Variable): boolean {
  return (
    // Stryker disable next-line MethodExpression: a parameter property's variable has one definition, so some and every agree
    variable.defs.some(
      ({ name }) =>
        name.parent.type === AST_NODE_TYPES.TSParameterProperty ||
        (name.parent.type === AST_NODE_TYPES.AssignmentPattern &&
          name.parent.parent.type === AST_NODE_TYPES.TSParameterProperty),
    ) ||
    holdsOnly(variable, ({ expressions }) => expressions.some(isOwnField))
  );
}

/** Whether the value is the method's own object or one of its fields. */
function isOwnField(value: TSESTree.Expression): boolean {
  return (
    value.type === AST_NODE_TYPES.ThisExpression ||
    (value.type === AST_NODE_TYPES.MemberExpression && value.object.type === AST_NODE_TYPES.ThisExpression)
  );
}
