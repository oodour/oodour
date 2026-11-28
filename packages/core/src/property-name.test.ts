import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AST_NODE_TYPES as T,
  simpleTraverse,
  type TSESTree,
} from '@typescript-eslint/typescript-estree';
import { parseSource } from './index.ts';
import { propertyName } from './property-name.ts';

type Named =
  | TSESTree.MemberExpression
  | TSESTree.MethodDefinition
  | TSESTree.Property
  | TSESTree.PropertyDefinition;

const named = new Set<string>([
  T.MemberExpression,
  T.MethodDefinition,
  T.Property,
  T.PropertyDefinition,
]);

const isNamed = (node: TSESTree.Node): node is Named => named.has(node.type);

/** The name of each member access, method, property and field in the text, in source order. */
function names(text: string): (string | null)[] {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  const found: (string | null)[] = [];

  simpleTraverse(source.ast, {
    enter(node) {
      if (isNamed(node)) {
        found.push(propertyName(node));
      }
    },
  });

  return found;
}

describe('propertyName', () => {
  it('reads an identifier and a literal key', () => {
    assert.deepEqual(names("o.a; ({ b: 1, 'c': 2, 3: 4 });"), [
      'a',
      'b',
      'c',
      '3',
    ]);
  });

  it('reads a computed literal, a regular expression and a template without expressions', () => {
    assert.deepEqual(names("o['a']; o[1]; o[/x/g]; o[`b`];"), [
      'a',
      '1',
      '/x/g',
      'b',
    ]);
  });

  it('reads nothing from a key only running the code would tell, or from a private name', () => {
    assert.deepEqual(
      names(
        "o[k]; o[`a${k}`]; o['a' + 'b']; class C { #p = 1; m() { this.#p; } }",
      ),
      [null, null, null, null, 'm', null],
    );
  });

  it('reads the keys of methods and fields', () => {
    assert.deepEqual(names("class C { a() {} ['b'] = 1; static [`c`]() {} }"), [
      'a',
      'b',
      'c',
    ]);
  });
});
