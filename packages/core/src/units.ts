import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';

/**
 * The kinds of unit the walk opens and closes; a metric names the kinds it measures.
 *
 * - `function`: a function declaration, function expression or arrow function.
 * - `declared-function`: a `TSDeclareFunction`, such as an overload signature or a `declare function`, which has
 *   parameters and no body.
 * - `field-initializer`: the value of a class field (a `PropertyDefinition`; ESLint opens no unit for an `accessor`
 *   field's value), unless that value is itself a function, which is a `function` unit and nothing more.
 * - `static-block`: a class `static { }` block.
 * - `class`: a class declaration or class expression.
 * - `file`: the whole file, its `Program` node.
 */
export type UnitKind = 'function' | 'declared-function' | 'field-initializer' | 'static-block' | 'class' | 'file';

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;
type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

interface UnitAt<TKind extends UnitKind, TNode extends TSESTree.Node> {
  readonly kind: TKind;
  /** The node the unit is reported on: the function, the field's value, the static block. */
  readonly node: TNode;
  /** The node that holds `node`. */
  readonly parent: TSESTree.Node | undefined;
}

export type Unit =
  | UnitAt<'function', FunctionNode>
  | UnitAt<'declared-function', TSESTree.TSDeclareFunction>
  | UnitAt<'field-initializer', TSESTree.Node>
  | UnitAt<'static-block', TSESTree.StaticBlock>
  | UnitAt<'class', ClassNode>
  | UnitAt<'file', TSESTree.Program>;

/** Which slot of its parent a node fills (`test`, `alternate`, `body`...). */
export interface Position {
  readonly parent: TSESTree.Node | undefined;
  readonly key: string | undefined;
}

/** The units a node opens, outermost first: a class that is a field's value opens the field initializer, then the class. */
export function unitsAt(node: TSESTree.Node, { parent, key }: Position): readonly Unit[] {
  if (isFunction(node)) {
    return [{ kind: 'function', node, parent }];
  }

  if (node.type === AST_NODE_TYPES.TSDeclareFunction) {
    return [{ kind: 'declared-function', node, parent }];
  }

  if (node.type === AST_NODE_TYPES.StaticBlock) {
    return [{ kind: 'static-block', node, parent }];
  }

  if (node.type === AST_NODE_TYPES.Program) {
    return [{ kind: 'file', node, parent }];
  }

  const units: Unit[] =
    parent?.type === AST_NODE_TYPES.PropertyDefinition && key === 'value' ? [{ kind: 'field-initializer', node, parent }] : [];

  if (node.type === AST_NODE_TYPES.ClassDeclaration || node.type === AST_NODE_TYPES.ClassExpression) {
    units.push({ kind: 'class', node, parent });
  }

  return units;
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

    case 'class': {
      return unit.node.id === null ? 'Anonymous class' : `Class '${unit.node.id.name}'`;
    }

    case 'file': {
      return 'File';
    }

    case 'declared-function': {
      return unit.node.id === null ? 'Function' : `Function '${unit.node.id.name}'`;
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
