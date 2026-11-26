import type { Variable } from '@typescript-eslint/scope-manager';
import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';
import { defineMetric } from '../metric.ts';
import { propertyName } from '../property-name.ts';
import { scopesOf } from '../source.ts';
import type { Unit } from '../units.ts';

/** The values a function depends on through its parameters, and how many of them are keys read from an options object. */
export interface ParameterCount {
  readonly count: number;
  readonly keys: number;
}

/**
 * Counts parameters as values the function depends on: each key of an object pattern, each element of an array
 * pattern, and each key the body reads from an anonymous object, an identifier parameter with no type or an inline
 * object type that the body only reads data from. A parameter of a named type (the result of Introduce Parameter
 * Object), or one the body sends a message to or passes on whole, counts as one. A function passed straight to a call
 * as a callback has nothing to report, since the callee decides its parameters.
 */
export const maxParams = defineMetric({
  name: 'max-params',
  units: ['function', 'declared-function'],
  open: () => undefined,
  close: (_state, unit, source): ParameterCount | undefined => {
    if (isCallbackArgument(unit)) {
      return undefined;
    }

    const { node } = unit;
    const declared = scopesOf(source).getDeclaredVariables(node);
    const weights = node.params.filter((param) => !isThisParameter(param)).map((param) => weightOf(param, declared));

    return {
      count: weights.reduce((sum, weight) => sum + weight.count, 0),
      keys: weights.reduce((sum, weight) => sum + weight.keys, 0),
    };
  },
});

/** A function handed straight to a call, whose parameters the callee decides. */
function isCallbackArgument({ node, parent }: Unit): boolean {
  return parent?.type === AST_NODE_TYPES.CallExpression && parent.arguments.some((argument) => argument === node);
}

function isThisParameter(param: TSESTree.Parameter): boolean {
  return param.type === AST_NODE_TYPES.Identifier && param.name === 'this';
}

function weightOf(param: TSESTree.Parameter, declared: readonly Variable[]): ParameterCount {
  const binding = param.type === AST_NODE_TYPES.AssignmentPattern ? param.left : param;

  if (binding.type === AST_NODE_TYPES.ObjectPattern) {
    return { count: binding.properties.length || 1, keys: binding.properties.length };
  }

  if (binding.type === AST_NODE_TYPES.ArrayPattern) {
    return { count: binding.elements.length, keys: 0 };
  }

  const keys = isAnonymousObject(binding) ? keysReadFrom(binding, declared) : 0;

  return { count: keys || 1, keys };
}

/** An identifier with no type, or an inline object type: a bag of values rather than a named parameter object. */
function isAnonymousObject(binding: TSESTree.Node): boolean {
  return (
    binding.type === AST_NODE_TYPES.Identifier &&
    (binding.typeAnnotation === undefined ||
      binding.typeAnnotation.typeAnnotation.type === AST_NODE_TYPES.TSTypeLiteral)
  );
}

/** How many distinct keys the body reads from the parameter, or 0 when it uses the parameter in any other way. */
function keysReadFrom(binding: TSESTree.Node, declared: readonly Variable[]): number {
  const keys = declared
    .filter(({ identifiers }) => identifiers.some((identifier) => identifier === binding))
    .flatMap(({ references }) => references)
    // A default value writes the parameter itself, which reads no key.
    .filter(({ identifier }) => identifier !== binding)
    .flatMap(({ identifier }) => keysReadBy(identifier) ?? [null]);

  return keys.includes(null) ? 0 : new Set(keys).size;
}

/** The keys a reference reads (`null` for a key computed at run time), or `undefined` when it uses the object otherwise. */
function keysReadBy(reference: TSESTree.Node): readonly (string | null)[] | undefined {
  const { parent } = reference;
  const target = destructuringTarget(reference);

  if (target?.type === AST_NODE_TYPES.ObjectPattern) {
    return target.properties.map((property) =>
      // Stryker disable next-line StringLiteral: any marker that is not a key the body reads counts the rest once
      property.type === AST_NODE_TYPES.Property ? propertyName(property) : '...',
    );
  }

  // A reference used as a computed key (`x[options]`) has no static name, so it counts the object whole.
  if (parent?.type !== AST_NODE_TYPES.MemberExpression || isCallee(parent)) {
    return undefined;
  }

  return [propertyName(parent)];
}

/** The pattern a declaration or an assignment unpacks the reference into, if any. */
function destructuringTarget(reference: TSESTree.Node): TSESTree.Node | undefined {
  const { parent } = reference;

  if (parent?.type === AST_NODE_TYPES.VariableDeclarator) {
    return parent.id;
  }

  // When the reference is the left side, the target is the reference itself, which unpacks nothing.
  return parent?.type === AST_NODE_TYPES.AssignmentExpression ? parent.left : undefined;
}

function isCallee(member: TSESTree.MemberExpression): boolean {
  return member.parent.type === AST_NODE_TYPES.CallExpression && member.parent.callee === member;
}
