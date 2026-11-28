import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  maxParams,
  measure,
  parseSource,
  scopesOf,
  type Source,
  unitName,
} from '../index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Each function as `<name>: <count>/<keys>`. */
function counts(text: string): string[] {
  return measure(sourceOf(text), [maxParams])
    .of(maxParams)
    .map(
      ({ unit, value }) =>
        `${unitName(unit)}: ${String(value.count)}/${String(value.keys)}`,
    );
}

describe('maxParams', () => {
  it('counts each key of an object pattern, each element of an array pattern, and leaves out this', () => {
    assert.deepEqual(
      counts('function f(this: X, { a, b = 1 }, [c, , d], e = 2) {}'),
      ["Function 'f': 6/2"],
    );
  });

  it('counts an empty object pattern as one', () => {
    assert.deepEqual(counts('function f({}) {}'), ["Function 'f': 1/0"]);
  });

  it('counts the distinct keys the body only reads from an untyped or inline-typed parameter', () => {
    const text = [
      'function f(o) { return o.a + o["b"] + o[`c`] + o.a; }',
      'function g(o: { a: number }) { const { a, b, ...rest } = o; return a; }',
      'function h(o: Options) { return o.a + o.b; }',
    ].join('\n');

    assert.deepEqual(counts(text), [
      "Function 'f': 3/3",
      "Function 'g': 3/3",
      "Function 'h': 1/0",
    ]);
  });

  it('counts a parameter whole when the body sends it a message, passes it on, or reads a key computed at run time', () => {
    const text = [
      'function f(o) { o.a(); }',
      'function g(o) { h(o); }',
      'function k(o) { return o[key] + o.b; }',
      'function m(o) { return o.#p; }',
      "function n(o) { return o['a' + 'b']; }",
    ].join('\n');

    assert.deepEqual(counts(text), [
      "Function 'f': 1/0",
      "Function 'g': 1/0",
      "Function 'k': 1/0",
      "Function 'm': 1/0",
      "Function 'n': 1/0",
    ]);
  });

  it('reads the keys of an assignment that unpacks the parameter, and not its default value', () => {
    assert.deepEqual(
      counts('function f(o = {}) { let a; ({ a } = o); return o.b; }'),
      ["Function 'f': 2/2"],
    );
  });

  it('measures a declared function and leaves out a callback argument', () => {
    const text = [
      'declare function f(a, b): void;',
      'run((a, b, c) => a);',
      'const g = (a) => a;',
    ].join('\n');

    assert.deepEqual(counts(text), [
      "Function 'f': 2/0",
      'Arrow function: 1/0',
    ]);
  });

  it("uses the caller's scope analysis when it hands one over", () => {
    const text = 'function f(o) { return o.a; }';
    // The scope analysis of another parse of the text knows none of this tree's nodes, so it finds no variables.
    const scopes = scopesOf(sourceOf(text));

    assert.deepEqual(
      measure({ ...sourceOf(text), scopes }, [maxParams])
        .of(maxParams)
        .map(({ value }) => value),
      [{ count: 1, keys: 0 }],
    );
  });

  it('names itself max-params where a run left it out', () => {
    assert.throws(
      () => measure(sourceOf(''), []).of(maxParams),
      /^Error: The metric 'max-params' was not measured/,
    );
  });
});
