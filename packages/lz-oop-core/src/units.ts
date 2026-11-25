import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';

/**
 * The kinds of unit the walk opens and closes; a metric names the kinds it measures.
 *
 * - `function`: a function declaration, function expression or arrow function.
 * - `field-initializer`: the value of a class field (`PropertyDefinition` or `AccessorProperty`), unless that value is
 *   itself a function, which is a `function` unit and nothing more.
 * - `static-block`: a class `static { }` block.
 */
export type UnitKind = 'function' | 'field-initializer' | 'static-block';

export interface Unit {
  readonly kind: UnitKind;
  /** The node the unit is reported on: the function, the field's value, the static block. */
  readonly node: TSESTree.Node;
  /** The node that holds `node`. */
  readonly parent: TSESTree.Node | undefined;
  /** The unit around this one, of any kind. */
  readonly enclosing: Unit | undefined;
}

/** Which slot of its parent a node fills (`test`, `alternate`, `body`...). */
export interface Position {
  readonly parent: TSESTree.Node | undefined;
  readonly key: string | undefined;
}

/** The kinds of unit a node opens, outer first. */
export function unitKindsOf(node: TSESTree.Node, { parent, key }: Position): readonly UnitKind[] {
  if (isFunction(node)) {
    return ['function'];
  }

  if (node.type === AST_NODE_TYPES.StaticBlock) {
    return ['static-block'];
  }

  const field =
    parent?.type === AST_NODE_TYPES.PropertyDefinition || parent?.type === AST_NODE_TYPES.AccessorProperty;

  return field && key === 'value' ? ['field-initializer'] : [];
}

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

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
export function unitName({ kind, node, parent }: Unit): string {
  switch (kind) {
    case 'field-initializer': {
      return 'Class field initializer';
    }

    case 'static-block': {
      return 'Class static block';
    }

    case 'function': {
      const name = isFunction(node) ? functionNameWithKind(node, parent) : 'function';

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
      if ('regex' in key) {
        return `/${key.regex.pattern}/${key.regex.flags}`;
      }

      return 'bigint' in key ? key.bigint : String(key.value);
    }

    case AST_NODE_TYPES.TemplateLiteral: {
      return key.expressions.length === 0 ? (key.quasis[0]?.value.cooked ?? undefined) : undefined;
    }

    default: {
      return undefined;
    }
  }
}
