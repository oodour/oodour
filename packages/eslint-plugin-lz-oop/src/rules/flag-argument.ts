import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { Type } from 'typescript';
import { createRule } from '../create-rule.ts';

/**
 * Reports a parameter the body branches on when it can only hold a few constants: its declared type is `boolean` or a
 * union of literals (by the syntax, or by the checker when type information is there), its default is a boolean or a
 * string, or a call in the same file passes it a boolean, string or number literal. A callback passed straight to a call
 * is not checked, since the callee decides its parameters, nor is the parameter an assertion function asserts.
 */
export const flagArgument = createRule<[], 'found'>({
  name: 'flag-argument',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a parameter whose value the function branches on to pick which logic runs',
      concept: 'Flag Argument',
      requiresTypeChecking: false,
      remedy: { kind: 'none', because: 'which functions or objects take over each value is a design choice' },
      tier: 'recommended',
      skipsTestFiles: true,
    },
    messages: {
      found:
        "Stop and look: Flag Argument, the {{function}} branches on its parameter '{{name}}'. Look for callers that " +
        'pass a constant to choose a path. Cure: Remove Flag Argument, a named function for each value, or inject ' +
        'the object that plays the role.',
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    const unproven: Candidate[] = [];
    const callsByName = new Map<string, TSESTree.CallExpression[]>();
    const { program, esTreeNodeToTSNodeMap } = context.sourceCode.parserServices ?? {};
    // Without type information only the declared type and the default value can show a flag type.
    const hasFlagType = (binding: TSESTree.Identifier): boolean => {
      if (!program || !esTreeNodeToTSNodeMap) {
        return false;
      }

      const checker = program.getTypeChecker();
      const type = checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(binding));
      const isLiteral = (member: Type): boolean =>
        member.isLiteral() || member === checker.getTrueType() || member === checker.getFalseType();

      return type.isUnion() && type.types.every(isLiteral);
    };
    const report = ({ param, fn, name }: Candidate): void => {
      context.report({
        node: param,
        messageId: 'found',
        data: { function: ASTUtils.getFunctionNameWithKind(fn, context.sourceCode), name },
      });
    };

    return {
      ':function'(fn: FunctionNode) {
        if (isCallbackArgument(fn)) {
          return;
        }

        const declared = context.sourceCode.getDeclaredVariables(fn);

        fn.params.forEach((param, index) => {
          const binding = param.type === AST_NODE_TYPES.AssignmentPattern ? param.left : param;
          const variable = declared.find(({ identifiers }) => identifiers.some((identifier) => identifier === binding));

          if (
            binding.type !== AST_NODE_TYPES.Identifier ||
            variable === undefined ||
            !isBranchedOn(variable) ||
            isAsserted(fn, binding.name)
          ) {
            return;
          }

          const candidate = { param, fn, name: binding.name, index };

          if (isFlagTyped(param) || hasFlagType(binding)) {
            report(candidate);
          } else {
            unproven.push(candidate);
          }
        });
      },
      CallExpression(call) {
        const name = calleeName(call.callee);

        if (name !== undefined) {
          callsByName.set(name, [...(callsByName.get(name) ?? []), call]);
        }
      },
      'Program:exit'() {
        unproven
          .filter(({ fn, index }) => {
            const name = functionName(fn);

            return name !== undefined && (callsByName.get(name) ?? []).some((call) => isFlagLiteral(call.arguments[index]));
          })
          .forEach(report);
      },
    };
  },
});

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

/** A parameter the body branches on, waiting for a call in the file to show that callers pass it a constant. */
interface Candidate {
  readonly param: TSESTree.Parameter;
  readonly fn: FunctionNode;
  readonly name: string;
  readonly index: number;
}

/** An assertion function (`asserts condition`) tests its parameter to check it, not to pick what to do. */
function isAsserted(fn: FunctionNode, name: string): boolean {
  const predicate = fn.returnType?.typeAnnotation;

  return (
    predicate?.type === AST_NODE_TYPES.TSTypePredicate &&
    predicate.asserts &&
    predicate.parameterName.type === AST_NODE_TYPES.Identifier &&
    predicate.parameterName.name === name
  );
}

/** A function handed straight to a call, whose parameters the callee decides. */
function isCallbackArgument(fn: FunctionNode): boolean {
  return fn.parent.type === AST_NODE_TYPES.CallExpression && fn.parent.arguments.some((argument) => argument === fn);
}

// shortcut: calls match functions by name alone, so `a.render(true)` counts for every `render` in the file; resolve the
// callee through scope or types if this reports a function that the call does not reach.
function calleeName(callee: TSESTree.Expression): string | undefined {
  if (callee.type === AST_NODE_TYPES.MemberExpression) {
    return ASTUtils.getPropertyName(callee) ?? undefined;
  }

  return callee.type === AST_NODE_TYPES.Identifier ? callee.name : undefined;
}

/** The name callers use for the function: its own, or that of the variable that holds it. */
function functionName(fn: FunctionNode): string | undefined {
  const { parent } = fn;

  if (parent.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier) {
    return parent.id.name;
  }

  if (parent.type === AST_NODE_TYPES.MethodDefinition || parent.type === AST_NODE_TYPES.Property) {
    return ASTUtils.getPropertyName(parent) ?? undefined;
  }

  return fn.id?.name;
}

function isFlagLiteral(argument: TSESTree.CallExpressionArgument | undefined): boolean {
  return argument?.type === AST_NODE_TYPES.Literal && ['boolean', 'string', 'number'].includes(typeof argument.value);
}

/** The parameter's declared type or default value marks it as a choice among a few constants. */
function isFlagTyped(param: TSESTree.Parameter): boolean {
  if (param.type === AST_NODE_TYPES.AssignmentPattern) {
    return param.right.type === AST_NODE_TYPES.Literal && ['boolean', 'string'].includes(typeof param.right.value);
  }

  return param.type === AST_NODE_TYPES.Identifier && param.typeAnnotation !== undefined && isFlagType(param.typeAnnotation.typeAnnotation);
}

/** `boolean`, or a union of literals such as `'fast' | 'safe'`. */
function isFlagType(type: TSESTree.TypeNode): boolean {
  if (type.type === AST_NODE_TYPES.TSUnionType) {
    return type.types.every((member) => member.type === AST_NODE_TYPES.TSLiteralType);
  }

  return type.type === AST_NODE_TYPES.TSBooleanKeyword;
}

/** The body tests the parameter's value to choose which code runs. */
function isBranchedOn(variable: TSESLint.Scope.Variable): boolean {
  return variable.references.some(({ identifier }) => isTest(conditionOf(identifier)));
}

/**
 * The outermost expression that carries the parameter's value into a test: the parameter, wrapped in any number of
 * comparisons, negations, `&&` and `||`.
 */
function conditionOf(node: TSESTree.Node): TSESTree.Node {
  const { parent } = node;

  return parent !== undefined && carriesTruth(parent) ? conditionOf(parent) : node;
}

function carriesTruth(node: TSESTree.Node): boolean {
  return (
    (node.type === AST_NODE_TYPES.BinaryExpression && equalityOperators.has(node.operator)) ||
    (node.type === AST_NODE_TYPES.UnaryExpression && node.operator === '!') ||
    (node.type === AST_NODE_TYPES.LogicalExpression && node.operator !== '??')
  );
}

const equalityOperators = new Set(['===', '!==', '==', '!=']);

function isTest(node: TSESTree.Node): boolean {
  const { parent } = node;

  switch (parent?.type) {
    case AST_NODE_TYPES.ConditionalExpression:
    case AST_NODE_TYPES.DoWhileStatement:
    case AST_NODE_TYPES.ForStatement:
    case AST_NODE_TYPES.IfStatement:
    case AST_NODE_TYPES.WhileStatement: {
      return parent.test === node;
    }
    case AST_NODE_TYPES.SwitchStatement: {
      return parent.discriminant === node;
    }
    default: {
      return false;
    }
  }
}
