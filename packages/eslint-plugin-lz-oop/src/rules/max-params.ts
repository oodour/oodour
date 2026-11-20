import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

type Options = [{ readonly max: number }];

type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.TSDeclareFunction;

/** What one parameter adds to the count, and how many of those are keys read from an options object. */
interface Weight {
  readonly count: number;
  readonly keys: number;
}

/**
 * Counts parameters as values the function depends on: each key of an object pattern, each element of an array
 * pattern, and each key the body reads from an anonymous object, an identifier parameter with no type or an inline
 * object type that the body only reads data from. A parameter of a named type (the result of Introduce Parameter
 * Object), or one the body sends a message to or passes on whole, counts as one. A function passed straight to a call
 * as a callback is not checked, since the callee decides its parameters.
 */
export const maxParams = createRule<Options, 'found' | 'foundKeys'>({
  name: 'max-params',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Report a function that depends on more values than allowed, counting the keys read from an untyped or ' +
        'inline-typed options object',
      concept: 'Long Parameter List',
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'recommended',
      strictOptions: [{ max: 3 }],
    },
    messages: {
      found:
        'Stop and look: Long Parameter List, {{name}} takes {{count}} parameters (at most {{max}}). Look for values ' +
        'that travel together, or a flag that picks the behaviour. Cure: Introduce Parameter Object, Preserve Whole ' +
        'Object, or Remove Flag Argument; moving the same values into an options object does not cure it.',
      foundKeys:
        'Stop and look: Long Parameter List, {{name}} takes {{count}} parameters, {{keys}} of them keys read from an ' +
        'options object (at most {{max}}). Look for values that travel together, or a flag that picks the behaviour. ' +
        'Cure: Introduce Parameter Object, Preserve Whole Object, or Remove Flag Argument; moving the same values into ' +
        'an options object does not cure it.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'integer', minimum: 0 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ max: 4 }],
  },
  create(context, [{ max }]) {
    return {
      ':function, TSDeclareFunction'(node: FunctionNode) {
        if (isCallbackArgument(node)) {
          return;
        }

        const declared = context.sourceCode.getDeclaredVariables(node);
        const weights = node.params.filter((param) => !isThisParameter(param)).map((param) => weightOf(param, declared));
        const count = weights.reduce((sum, weight) => sum + weight.count, 0);
        const keys = weights.reduce((sum, weight) => sum + weight.keys, 0);

        if (count > max) {
          const name = nameOf(node, context.sourceCode);

          context.report({ node, messageId: keys > 0 ? 'foundKeys' : 'found', data: { name, count, keys, max } });
        }
      },
    };
  },
});

/** A function handed straight to a call, whose parameters the callee decides. */
function isCallbackArgument(node: FunctionNode): boolean {
  return node.parent.type === AST_NODE_TYPES.CallExpression && node.parent.arguments.some((argument) => argument === node);
}

function isThisParameter(param: TSESTree.Parameter): boolean {
  return param.type === AST_NODE_TYPES.Identifier && param.name === 'this';
}

function weightOf(param: TSESTree.Parameter, declared: readonly TSESLint.Scope.Variable[]): Weight {
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
function keysReadFrom(binding: TSESTree.Node, declared: readonly TSESLint.Scope.Variable[]): number {
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
      property.type === AST_NODE_TYPES.Property ? ASTUtils.getPropertyName(property) : '...',
    );
  }

  // A reference used as a computed key (`x[options]`) has no static name, so it counts the object whole.
  if (parent?.type !== AST_NODE_TYPES.MemberExpression || isCallee(parent)) {
    return undefined;
  }

  return [ASTUtils.getPropertyName(parent)];
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

function nameOf(node: FunctionNode, sourceCode: Readonly<TSESLint.SourceCode>): string {
  if (node.type === AST_NODE_TYPES.TSDeclareFunction) {
    return node.id === null ? 'function' : `function '${node.id.name}'`;
  }

  return ASTUtils.getFunctionNameWithKind(node, sourceCode);
}
