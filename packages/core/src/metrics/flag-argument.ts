import type { Variable } from '@typescript-eslint/scope-manager';
import { AST_NODE_TYPES as T, type TSESTree } from '@typescript-eslint/typescript-estree';
import type { Type } from 'typescript';
import { defineMetric } from '../metric.ts';
import { propertyName } from '../property-name.ts';
import { scopesOf, type Source } from '../source.ts';

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

/** A parameter the function branches on that can only hold a few constants. */
export interface FlagArgument {
  readonly param: TSESTree.Parameter;
  readonly fn: FunctionNode;
  readonly name: string;
}

/** A parameter the body branches on, waiting for a call in the file to show that callers pass it a constant. */
interface Candidate extends FlagArgument {
  readonly index: number;
}

interface State {
  /** The `return` statements of each function around the current node, innermost last. */
  readonly returns: TSESTree.ReturnStatement[][];
  readonly proven: FlagArgument[];
  readonly unproven: Candidate[];
  readonly callsByName: Map<string, TSESTree.CallExpression[]>;
}

/**
 * The flag arguments of each file: a parameter the body branches on when it can only hold a few constants. Its
 * declared type is `boolean` or a union of literals (by the syntax, or by the checker when type information is there),
 * its default is a boolean or a string, or a call in the same file passes it a boolean, string or number literal. A
 * callback passed straight to a call is not checked, since the callee decides its parameters, nor is the parameter an
 * assertion function asserts, nor a factory, whose every `return` creates an object.
 */
export const flagArgument = defineMetric({
  name: 'flag-argument',
  units: ['file'],
  open: (): State => ({ returns: [], proven: [], unproven: [], callsByName: new Map() }),
  enter(node, { returns, callsByName }) {
    if (isFunction(node)) {
      returns.push([]);
    } else if (node.type === T.ReturnStatement) {
      returns.at(-1)?.push(node);
    } else if (node.type === T.CallExpression) {
      const name = calleeName(node.callee);

      if (name !== undefined) {
        callsByName.set(name, [...(callsByName.get(name) ?? []), node]);
      }
    }
  },
  leave(node, state, _at, source) {
    if (isFunction(node)) {
      checkParameters(node, state, source);
    }
  },
  close: ({ proven, unproven, callsByName }): readonly FlagArgument[] | undefined => {
    const called = unproven.filter(({ fn, index }) => {
      const name = functionName(fn);

      return name !== undefined && (callsByName.get(name) ?? []).some((call) => isFlagLiteral(call.arguments[index]));
    });
    const flags = [...proven, ...called]
      .map(({ param, fn, name }) => ({ param, fn, name }))
      .sort((a, b) => a.param.range[0] - b.param.range[0]);

    return flags.length > 0 ? flags : undefined;
  },
});

function checkParameters(fn: FunctionNode, { returns, proven, unproven }: State, source: Source): void {
  const ownReturns = returns.pop() ?? [];

  if (isCallbackArgument(fn) || isFactory(ownReturns)) {
    return;
  }

  const declared = scopesOf(source).getDeclaredVariables(fn);

  fn.params.forEach((param, index) => {
    const binding = param.type === T.AssignmentPattern ? param.left : param;
    const variable = declared.find(({ identifiers }) => identifiers.some((identifier) => identifier === binding));

    if (binding.type !== T.Identifier || variable === undefined || !isBranchedOn(variable) || isAsserted(fn, binding.name)) {
      return;
    }

    const candidate = { param, fn, name: binding.name, index };

    if (isFlagTyped(param) || hasFlagType(binding, source)) {
      proven.push(candidate);
    } else {
      unproven.push(candidate);
    }
  });
}

const isFunction = (node: TSESTree.Node): node is FunctionNode =>
  node.type === T.ArrowFunctionExpression || node.type === T.FunctionDeclaration || node.type === T.FunctionExpression;

/** By the checker, when type information is there: a union of literals, which `boolean` is to the checker. */
function hasFlagType(binding: TSESTree.Identifier, { types }: Source): boolean {
  if (types === undefined) {
    return false;
  }

  const checker = types.program.getTypeChecker();
  const type = checker.getTypeAtLocation(types.esTreeNodeToTSNodeMap.get(binding));
  const isLiteral = (member: Type): boolean =>
    member.isLiteral() || member === checker.getTrueType() || member === checker.getFalseType();

  return type.isUnion() && type.types.every(isLiteral);
}

/** An assertion function (`asserts condition`) tests its parameter to check it, not to pick what to do. */
function isAsserted(fn: FunctionNode, name: string): boolean {
  const predicate = fn.returnType?.typeAnnotation;

  return (
    predicate?.type === T.TSTypePredicate &&
    predicate.asserts &&
    predicate.parameterName.type === T.Identifier &&
    predicate.parameterName.name === name
  );
}

/** A factory branches only to choose which class to create: that choice belongs in it, and nowhere else. */
function isFactory(returns: readonly TSESTree.ReturnStatement[]): boolean {
  return returns.length > 0 && returns.every(({ argument }) => argument?.type === T.NewExpression);
}

/** A function handed straight to a call, whose parameters the callee decides. */
function isCallbackArgument(fn: FunctionNode): boolean {
  return fn.parent.type === T.CallExpression && fn.parent.arguments.some((argument) => argument === fn);
}

// shortcut: calls match functions by name alone, so `a.render(true)` counts for every `render` in the file; resolve the
// callee through scope or types if this reports a function that the call does not reach.
function calleeName(callee: TSESTree.Expression): string | undefined {
  if (callee.type === T.MemberExpression) {
    return propertyName(callee) ?? undefined;
  }

  return callee.type === T.Identifier ? callee.name : undefined;
}

/** The name callers use for the function: its own, or that of the variable that holds it. */
function functionName(fn: FunctionNode): string | undefined {
  const { parent } = fn;

  if (parent.type === T.VariableDeclarator && parent.id.type === T.Identifier) {
    return parent.id.name;
  }

  if (parent.type === T.MethodDefinition || parent.type === T.Property) {
    return propertyName(parent) ?? undefined;
  }

  return fn.id?.name;
}

function isFlagLiteral(argument: TSESTree.CallExpressionArgument | undefined): boolean {
  return argument?.type === T.Literal && ['boolean', 'string', 'number'].includes(typeof argument.value);
}

/** The parameter's declared type or default value marks it as a choice among a few constants. */
function isFlagTyped(param: TSESTree.Parameter): boolean {
  if (param.type === T.AssignmentPattern) {
    return param.right.type === T.Literal && ['boolean', 'string'].includes(typeof param.right.value);
  }

  return param.type === T.Identifier && param.typeAnnotation !== undefined && isFlagType(param.typeAnnotation.typeAnnotation);
}

/** `boolean`, or a union of literals such as `'fast' | 'safe'`. */
function isFlagType(type: TSESTree.TypeNode): boolean {
  if (type.type === T.TSUnionType) {
    return type.types.every((member) => member.type === T.TSLiteralType);
  }

  return type.type === T.TSBooleanKeyword;
}

/** The body tests the parameter's value to choose which code runs. */
function isBranchedOn(variable: Variable): boolean {
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
    (node.type === T.BinaryExpression && equalityOperators.has(node.operator)) ||
    (node.type === T.UnaryExpression && node.operator === '!') ||
    (node.type === T.LogicalExpression && node.operator !== '??')
  );
}

const equalityOperators = new Set(['===', '!==', '==', '!=']);

function isTest(node: TSESTree.Node): boolean {
  const { parent } = node;

  switch (parent?.type) {
    case T.ConditionalExpression:
    case T.DoWhileStatement:
    case T.ForStatement:
    case T.IfStatement:
    case T.WhileStatement: {
      return parent.test === node;
    }
    case T.SwitchStatement: {
      // The discriminant is the only expression a switch holds directly; its cases are SwitchCase nodes.
      return true;
    }
    default: {
      return false;
    }
  }
}
