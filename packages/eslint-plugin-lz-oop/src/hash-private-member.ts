import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import type { SelectorFix } from './define-selector-rule.ts';

/**
 * Turns a TypeScript `private` member into a `#private` one: drops the modifier, renames the key, and renames each
 * `this.<name>` in the class body.
 */
export const hashPrivateMember: SelectorFix = (node, fixer, sourceCode) => {
  if (
    (node.type !== AST_NODE_TYPES.PropertyDefinition && node.type !== AST_NODE_TYPES.MethodDefinition) ||
    node.key.type !== AST_NODE_TYPES.Identifier ||
    node.decorators.length > 0
  ) {
    return null;
  }

  const { name } = node.key;
  const sameName = node.parent.body.filter(
    (member) =>
      'key' in member &&
      (member.key.type === AST_NODE_TYPES.Identifier || member.key.type === AST_NODE_TYPES.PrivateIdentifier) &&
      member.key.name === name,
  );

  if (sameName.length > 1) {
    return null;
  }

  const modifier = sourceCode.getTokens(node).find((token) => token.value === 'private');

  if (modifier === undefined) {
    return null;
  }

  const classTokens = sourceCode.getTokens(node.parent);
  const computedThisAccess = classTokens.some(
    (token, index) => token.value === 'this' && classTokens[index + 1]?.value === '[',
  );

  if (computedThisAccess) {
    return null;
  }

  const memberUses = classTokens.filter(
    (token, index) =>
      token.type === AST_TOKEN_TYPES.Identifier &&
      token.value === name &&
      ['.', '?.'].includes(classTokens[index - 1]?.value ?? ''),
  );
  // Through another receiver (`other.cents`, `Ids.next`) the member may belong to another class, or need `other.#cents`.
  const onlyThroughThis = memberUses.every((token) => {
    const dot = sourceCode.getTokenBefore(token);

    return dot?.value === '.' && sourceCode.getTokenBefore(dot)?.value === 'this';
  });

  if (!onlyThroughThis) {
    return null;
  }

  const afterModifier = sourceCode.getTokenAfter(modifier);

  return [
    fixer.removeRange([modifier.range[0], afterModifier?.range[0] ?? modifier.range[1]]),
    fixer.replaceText(node.key, `#${name}`),
    ...memberUses.map((token) => fixer.replaceText(token, `#${name}`)),
  ];
};
