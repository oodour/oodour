import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flagArgument, measure, parseSource, type Source } from '../index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** The name of each flag argument in the file. */
function flags(text: string): string[] {
  return measure(sourceOf(text), [flagArgument])
    .of(flagArgument)
    .flatMap(({ value }) => value)
    .map(({ name }) => name);
}

describe('flagArgument', () => {
  it('reports a boolean parameter the body branches on', () => {
    assert.deepEqual(flags('function f(fast: boolean) { if (fast) { g(); } }'), ['fast']);
  });

  it('reports a union of literals, and a boolean or string default', () => {
    const text =
      "function f(mode: 'a' | 'b') { return mode === 'a' ? 1 : 2; } function g(on = false, kind = 'x') { while (!on && kind) {} }";

    assert.deepEqual(flags(text), ['mode', 'on', 'kind']);
  });

  it('passes an untyped parameter until a call in the file passes it a literal', () => {
    assert.deepEqual(flags('function f(on) { if (on) {} }'), []);
    assert.deepEqual(flags('function f(on) { if (on) {} } f(true);'), ['on']);
    assert.deepEqual(flags('const o = { f(x, on) { switch (on) {} } }; o.f(1, 2);'), ['on']);
  });

  it('passes a parameter used only as a value', () => {
    assert.deepEqual(flags('function f(on: boolean) { return on; }'), []);
  });

  it('passes a callback argument, an asserted parameter and a factory', () => {
    const text = [
      'run((on: boolean) => { if (on) {} });',
      'function check(ok: boolean): asserts ok { if (!ok) { throw new Error(); } }',
      'function make(big: boolean) { if (big) { return new Big(); } return new Small(); }',
    ].join('\n');

    assert.deepEqual(flags(text), []);
  });

  it('lists the flags in source order', () => {
    assert.deepEqual(flags('function f(a) { if (a) {} } function g(b: boolean) { if (b) {} } f(1);'), ['a', 'b']);
  });
});
