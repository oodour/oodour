import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';

/**
 * The kinds of unit the walk opens and closes; a metric names the kinds it measures.
 *
 * - `function`: a function declaration, function expression or arrow function.
 * - `field-initializer`: the value of a class field (a `PropertyDefinition`; ESLint opens no unit for an `accessor`
 *   field's value), unless that value is itself a function, which is a `function` unit and nothing more.
 * - `static-block`: a class `static { }` block.
 */
export type UnitKind = 'function' | 'field-initializer' | 'static-block';

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

interface UnitAt<TKind extends UnitKind, TNode extends TSESTree.Node> {
  readonly kind: TKind;
  /** The node the unit is reported on: the function, the field's value, the static block. */
  readonly node: TNode;
  /** The node that holds `node`. */
  readonly parent: TSESTree.Node | undefined;
}

export type Unit =
  | UnitAt<'function', FunctionNode>
  | UnitAt<'field-initializer', TSESTree.Node>
  | UnitAt<'static-block', TSESTree.StaticBlock>;

/** Which slot of its parent a node fills (`test`, `alternate`, `body`...). */
export interface Position {
  readonly parent: TSESTree.Node | undefined;
  readonly key: string | undefined;
}

/** The unit a node opens, if any. */
export function unitAt(node: TSESTree.Node, { parent, key }: Position): Unit | undefined {
  if (isFunction(node)) {
    return { kind: 'function', node, parent };
  }

  if (node.type === AST_NODE_TYPES.StaticBlock) {
    return { kind: 'static-block', node, parent };
  }

  return parent?.type === AST_NODE_TYPES.PropertyDefinition && key === 'value'
    ? { kind: 'field-initializer', node, parent }
    : undefined;
}

function isFunction(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression
  );
}

/**
 * The name ESLint's `complexity` rule gives the unit, such as `Method 'total'`, `Arrow function`, `Class field
 * initializer`. ESLint's other rules name functions with the lower-case first word, as `getFunctionNameWithKind` does.
 */
export function unitName(unit: Unit): string {
  switch (unit.kind) {
    case 'field-initializer': {
      return 'Class field initializer';
    }

    case 'static-block': {
      return 'Class static block';
    }

    case 'function': {
      const name = functionNameWithKind(unit.node, unit.parent);

      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
}

type Member = TSESTree.MethodDefinition | TSESTree.Property | TSESTree.PropertyDefinition;

function memberOf(parent: TSESTree.Node | undefined): Member | undefined {
  switch (parent?.type) {
    case AST_NODE_TYPES.MethodDefinition:
    case AST_NODE_TYPES.Property:
    case AST_NODE_TYPES.PropertyDefinition: {
      return parent;
    }

    default: {
      return undefined;
    }
  }
}

/** ESLint's `getFunctionNameWithKind`, for the function nodes the walk opens units for. */
function functionNameWithKind(node: FunctionNode, parent: TSESTree.Node | undefined): string {
  const member = memberOf(parent);
  const words: string[] = [];

  if (member !== undefined && member.type !== AST_NODE_TYPES.Property) {
    if (member.static) {
      words.push('static');
    }

    if (!member.computed && member.key.type === AST_NODE_TYPES.PrivateIdentifier) {
      words.push('private');
    }
  }

  if (node.async) {
    words.push('async');
  }

  if (node.generator) {
    words.push('generator');
  }

  if (member === undefined) {
    if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
      words.push('arrow');
    }

    words.push('function');

    if (node.id) {
      words.push(`'${node.id.name}'`);
    }

    return words.join(' ');
  }

  if (member.type === AST_NODE_TYPES.PropertyDefinition) {
    words.push('method');
  } else if (member.kind === 'constructor') {
    return 'constructor';
  } else {
    words.push(member.kind === 'get' ? 'getter' : member.kind === 'set' ? 'setter' : 'method');
  }

  if (!member.computed && member.key.type === AST_NODE_TYPES.PrivateIdentifier) {
    words.push(`#${member.key.name}`);
  } else {
    const name = staticPropertyName(member);

    if (name !== undefined) {
      words.push(`'${name}'`);
    } else if (node.id) {
      words.push(`'${node.id.name}'`);
    }
  }

  return words.join(' ');
}

function staticPropertyName({ key, computed }: Member): string | undefined {
  switch (key.type) {
    case AST_NODE_TYPES.Identifier: {
      return computed ? undefined : key.name;
    }

    case AST_NODE_TYPES.Literal: {
      return String(key.value);
    }

    case AST_NODE_TYPES.TemplateLiteral: {
      return key.expressions.length === 0 ? (key.quasis[0]?.value.cooked ?? undefined) : undefined;
    }

    default: {
      return undefined;
    }
  }
}
