import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { measure, parseSource, privateAccess, type Source } from '../index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Each access as `<source text>: <underscored>`; without types no access has a non-public name. */
function accesses(text: string): string[] {
  return measure(sourceOf(text), [privateAccess])
    .of(privateAccess)
    .flatMap(({ value }) => value)
    .map(({ node, nonPublic, underscored }) => `${text.slice(...node.range)}: ${nonPublic ?? '-'} ${underscored ?? '-'}`);
}

describe('privateAccess', () => {
  it('finds an underscored member of another object, and not a dunder name or a computed key', () => {
    assert.deepEqual(accesses("o._a; o.__b; o['_c']; o.d;"), ['o._a: - _a']);
  });

  it('passes an access through this, super, or a variable that holds this in the same function', () => {
    const text = [
      'class A extends B {',
      '  m() { this._a; super._b; const self = this; self._c; (self as A)._d; }',
      '  n() { let self = this; self = this; self._e; }',
      '}',
    ].join('\n');

    assert.deepEqual(accesses(text), []);
  });

  it('passes a variable holding this when a function inside reads it, since it holds the same object', () => {
    assert.deepEqual(accesses('class A { m() { const self = this; return function () { self._a; }; } }'), []);
  });

  it('finds an access through a part of this, or a variable that holds something else too', () => {
    const text = [
      'class A {',
      '  m() { const { x } = this; x._b; }',
      '  n(o) { let y = this; y = o; y._c; }',
      '}',
    ].join('\n');

    assert.deepEqual(accesses(text), ['x._b: - _b', 'y._c: - _c']);
  });

  it('passes the name of a class around the access, an unnamed class expression by its variable', () => {
    const text = 'class A { static m() { A._a; } } const C = class { static m() { C._b; } }; A._c;';

    assert.deepEqual(accesses(text), ['A._c: - _c']);
  });

  it('has no measurement for a file without such access, and goes by its name', () => {
    assert.deepEqual(measure(sourceOf('o.a;'), [privateAccess]).of(privateAccess), []);
    assert.equal(privateAccess.name, 'private-access');
  });
});
