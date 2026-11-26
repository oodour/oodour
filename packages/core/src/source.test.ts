import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyze, ScopeType } from '@typescript-eslint/scope-manager';
import { AST_NODE_TYPES as T, simpleTraverse, type TSESTree } from '@typescript-eslint/typescript-estree';
import { parseSource, scopesOf, type Source, variableOf } from './index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Every identifier in the tree with the given name, in source order. */
function identifiers(source: Source, name: string): TSESTree.Identifier[] {
  const found: TSESTree.Identifier[] = [];

  simpleTraverse(source.ast, {
    enter(node) {
      if (node.type === T.Identifier && node.name === name) {
        found.push(node);
      }
    },
  });

  return found;
}

describe('scopesOf', () => {
  it('analyses a module as a module, with a module scope', () => {
    const scopes = scopesOf(sourceOf('export const a = 1;'));

    assert.ok(scopes.scopes.some(({ type }) => type === ScopeType.module));
  });

  it('builds the analysis once per source', () => {
    const source = sourceOf('const a = 1;');

    assert.equal(scopesOf(source), scopesOf(source));
  });

  it('uses the analysis the caller handed over', () => {
    const parsed = sourceOf('const a = 1;');
    const scopes = analyze(parsed.ast);

    assert.equal(scopesOf({ ...parsed, scopes }), scopes);
  });
});

describe('variableOf', () => {
  it('finds the variable a name reads', () => {
    const source = sourceOf('function f(a) { return a; }');
    const [, read] = identifiers(source, 'a');

    assert.ok(read !== undefined);
    assert.equal(variableOf(source, read)?.name, 'a');
    assert.equal(variableOf(source, read)?.scope.type, ScopeType.function);
  });

  it('finds nothing for a global the file never declares', () => {
    const source = sourceOf('console.log(1);');
    const [name] = identifiers(source, 'console');

    assert.ok(name !== undefined);
    assert.equal(variableOf(source, name), undefined);
  });
});
