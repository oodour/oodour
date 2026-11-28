import {
  AST_NODE_TYPES as T,
  type TSESTree,
} from '@typescript-eslint/typescript-estree';
import ts from 'typescript';
import { holdsOnly } from '../holds-only.ts';
import { defineMetric } from '../metric.ts';
import { isTyped, type Source, variableOf } from '../source.ts';
import { withoutTypeAssertions } from '../without-type-assertions.ts';

/** A member access on another object that names a member its owner keeps to itself. */
export interface PrivateAccess {
  readonly node: TSESTree.MemberExpression;
  /** The member, when the program's types declare it `private` or `protected`; only with type information. */
  readonly nonPublic: string | undefined;
  /** The member, when its name starts with one underscore, the convention for a private member. */
  readonly underscored: string | undefined;
}

/**
 * The accesses in each file to a member of another object that its owner keeps private: by the types, a `private` or
 * `protected` member, which the compiler still lets another instance of the class read through a dot and any code read
 * through brackets with a string key; by convention, a name that starts with one underscore. An access through the
 * object's own `this`, `super` or a variable that holds `this`, or through the name of a class around it, is its own.
 */
export const privateAccess = defineMetric({
  name: 'private-access',
  needs: 'syntax',
  units: ['file'],
  open: (): PrivateAccess[] => [],
  enter(node, accesses, _at, source) {
    if (node.type !== T.MemberExpression || isOwnObject(node.object, source)) {
      return;
    }

    const nonPublic = nonPublicName(node, source);
    const underscored = underscoreName(node);

    if (
      (nonPublic !== undefined || underscored !== undefined) &&
      !namesEnclosingClass(node)
    ) {
      accesses.push({ node, nonPublic, underscored });
    }
  },
  close: (accesses): readonly PrivateAccess[] | undefined =>
    accesses.length > 0 ? accesses : undefined,
});

function nonPublicName(
  { object, property, computed }: TSESTree.MemberExpression,
  source: Source,
): string | undefined {
  const name =
    !computed && property.type === T.Identifier
      ? property.name
      : property.type === T.Literal && typeof property.value === 'string'
        ? property.value
        : undefined;

  if (!isTyped(source) || name === undefined) {
    return undefined;
  }

  const { types } = source;
  const checker = types.program.getTypeChecker();
  const type = checker.getNonNullableType(
    checker.getTypeAtLocation(types.esTreeNodeToTSNodeMap.get(object)),
  );
  const isNonPublic = (declaration: ts.Declaration): boolean =>
    (ts.getCombinedModifierFlags(declaration) &
      (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) !==
    0;

  return (type.isUnion() ? type.types : [type]).some(
    (member) =>
      member.getProperty(name)?.declarations?.some(isNonPublic) === true,
  )
    ? name
    : undefined;
}

function underscoreName({
  computed,
  property,
}: TSESTree.MemberExpression): string | undefined {
  return !computed &&
    property.type === T.Identifier &&
    property.name.startsWith('_') &&
    !property.name.startsWith('__')
    ? property.name
    : undefined;
}

function isOwnObject(object: TSESTree.Expression, source: Source): boolean {
  const bare = withoutTypeAssertions(object);
  const variable =
    bare.type === T.Identifier ? variableOf(source, bare) : undefined;

  return (
    bare.type === T.ThisExpression ||
    bare.type === T.Super ||
    (variable !== undefined &&
      holdsOnly(
        variable,
        ({ expressions, part }) =>
          !part &&
          expressions.some(
            (value) =>
              value.type === T.ThisExpression &&
              // Stryker disable next-line MethodExpression: holdsOnly accepts only declarators, and two declarators of one variable sit in one function or static block, so some and every agree
              variable.defs.every(
                ({ node }) => thisOwner(node) === thisOwner(value),
              ),
          ),
      ))
  );
}

/** Whether the object is the name of a class that encloses the access, which then reaches its own static member. */
function namesEnclosingClass({
  object,
  parent,
}: TSESTree.MemberExpression): boolean {
  if (object.type !== T.Identifier) {
    return false;
  }

  // ESLint gives the program a null parent where typescript-estree leaves it undefined, so the loop tests for either.
  for (
    let ancestor: TSESTree.Node | undefined = parent;
    ancestor;
    ancestor = ancestor.parent
  ) {
    if (classNameOf(ancestor) === object.name) {
      return true;
    }
  }

  return false;
}

/**
 * The node that decides what `this` means at the given node: the nearest function that is not an arrow, field
 * initializer (auto-accessor fields included) or static block around it, or none at the top level of a module.
 */
function thisOwner(node: TSESTree.Node): TSESTree.Node | undefined {
  let owner = node.parent;

  while (
    owner &&
    owner.type !== T.FunctionDeclaration &&
    owner.type !== T.FunctionExpression &&
    owner.type !== T.PropertyDefinition &&
    owner.type !== T.AccessorProperty &&
    owner.type !== T.StaticBlock
  ) {
    owner = owner.parent;
  }

  return owner;
}

/** A class's own name, or for an unnamed class expression the name of the variable that holds it. */
function classNameOf(node: TSESTree.Node): string | undefined {
  if (node.type === T.ClassDeclaration || node.type === T.ClassExpression) {
    const holder = node.parent;

    return (
      node.id?.name ??
      (holder.type === T.VariableDeclarator && holder.id.type === T.Identifier
        ? holder.id.name
        : undefined)
    );
  }

  return undefined;
}
