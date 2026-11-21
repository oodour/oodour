import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import { builtInConstructors } from '../built-in-constructors.ts';
import { createRule } from '../create-rule.ts';
import { withoutTypeAssertions } from '../without-type-assertions.ts';

/**
 * How many more uses another object needs than the method's own object. Reek reports any lead, but on real code a lead
 * of one was mostly noise: about 15% of those reports were true, and every lead-of-one report sampled was weak or false.
 */
const minimumLead = 2;

const primitive =
  ts.TypeFlags.StringLike |
  ts.TypeFlags.NumberLike |
  ts.TypeFlags.BooleanLike |
  ts.TypeFlags.BigIntLike |
  ts.TypeFlags.ESSymbolLike;

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
          (member.flags & primitive) !== 0 ||
          checker.isArrayType(member) ||
          checker.isTupleType(member) ||
          (declarations.length > 0 &&
            declarations.every(
              (declaration) =>
                program.isSourceFileDefaultLibrary(declaration.getSourceFile()) ||
                declaration.getSourceFile().fileName.includes('/node_modules/'),
            ))
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

        if (!method || !variable || isTemporary(variable) || cannotTakeAMove(variable)) {
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

/** Whether the variable holds a built-in collection or a literal the method creates for its own work. */
function isTemporary(variable: TSESLint.Scope.Variable): boolean {
  return initializersOf(variable).some(createsScratch);
}

/** Whether the value is a literal or built-in collection made here, alone or as the right side of `??`, `||` or `&&`. */
function createsScratch(init: TSESTree.Expression): boolean {
  return (
    init.type === AST_NODE_TYPES.ArrayExpression ||
    init.type === AST_NODE_TYPES.ObjectExpression ||
    (init.type === AST_NODE_TYPES.NewExpression &&
      init.callee.type === AST_NODE_TYPES.Identifier &&
      builtInConstructors.has(init.callee.name)) ||
    (init.type === AST_NODE_TYPES.LogicalExpression && createsScratch(withoutTypeAssertions(init.right)))
  );
}

/**
 * Whether the variable holds its own object or one of its fields, as in `const cache = this.cache` or `{ a } = this`,
 * or is a constructor parameter property, which is a field.
 */
function holdsOwnField(variable: TSESLint.Scope.Variable): boolean {
  return (
    variable.defs.some(({ name }) => name.parent.type === AST_NODE_TYPES.TSParameterProperty) ||
    initializersOf(variable).some(
      (init) =>
        init.type === AST_NODE_TYPES.ThisExpression ||
        (init.type === AST_NODE_TYPES.MemberExpression && init.object.type === AST_NODE_TYPES.ThisExpression),
    )
  );
}

/** The values the variable's declarators give it, without the type assertions that change only their static type. */
function initializersOf(variable: TSESLint.Scope.Variable): TSESTree.Expression[] {
  return variable.defs.flatMap(({ node }) =>
    node.type === AST_NODE_TYPES.VariableDeclarator && node.init ? [withoutTypeAssertions(node.init)] : [],
  );
}
