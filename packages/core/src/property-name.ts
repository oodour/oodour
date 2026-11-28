import {
  AST_NODE_TYPES as T,
  type TSESTree,
} from '@typescript-eslint/typescript-estree';

/**
 * The name a member access or a key reads: an identifier's, or a literal's or plain template's text when computed.
 * `null` for a private name and for a computed key that only running the code would tell, such as `o[k]`; unlike
 * eslint-utils' `getPropertyName`, it does not fold constant expressions such as `o['a' + 'b']`.
 */
export function propertyName(
  node:
    | TSESTree.MemberExpression
    | TSESTree.MethodDefinition
    | TSESTree.Property
    | TSESTree.PropertyDefinition,
): string | null {
  const key = node.type === T.MemberExpression ? node.property : node.key;

  if (node.computed) {
    return constantString(key);
  }

  if (key.type === T.Literal) {
    return String(key.value);
  }

  return key.type === T.Identifier ? key.name : null;
}

function constantString(node: TSESTree.Node): string | null {
  if (node.type === T.Literal) {
    return 'regex' in node
      ? `/${node.regex.pattern}/${node.regex.flags}`
      : String(node.value);
  }

  return node.type === T.TemplateLiteral && node.expressions.length === 0
    ? (node.quasis[0]?.value.cooked ?? null)
    : null;
}
