import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { abcSize, measure, parseSource, unitName } from '../index.ts';

/** Each function as `<name>: <assignments>/<sends>/<conditions>`. */
function counts(text: string): string[] {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return measure(source, [abcSize])
    .of(abcSize)
    .map(({ unit, value }) => `${unitName(unit)}: ${[value.assignments, value.sends, value.conditions].join('/')}`);
}

const body = (code: string): string[] => counts(`function f(p, q) { ${code} }`);

describe('abcSize', () => {
  it('counts nothing in an empty function', () => {
    assert.deepEqual(body(''), ["Function 'f': 0/0/0"]);
  });

  it('counts a declaration with a value, an assignment and an update as assignments', () => {
    assert.deepEqual(body('let u; let w = 1; p = 2; q++; p += 1;'), ["Function 'f': 4/0/0"]);
  });

  it('counts a call and a `new` as sends', () => {
    assert.deepEqual(body('g(); new C(); p.m();'), ["Function 'f': 0/3/0"]);
  });

  it('counts each comparison operator, and no other binary operator', () => {
    assert.deepEqual(body('p == q; p === q; p != q; p !== q; p < q; p > q; p <= q; p >= q; p + q; p in q;'), [
      "Function 'f': 0/0/8",
    ]);
  });

  it('counts a test that is not a comparison, of each statement that tests', () => {
    assert.deepEqual(body('if (p) {} while (p) {} do {} while (p); for (; p; ) {} p ? 1 : 2; for (;;) {}'), [
      "Function 'f': 0/0/6",
    ]);
  });

  it('counts a comparison as a test once', () => {
    assert.deepEqual(body('if (p === q) {}'), ["Function 'f': 0/0/1"]);
  });

  it('counts an else, and a ternary alternate, but not an else-if as an alternate', () => {
    assert.deepEqual(body('if (p) {} else {} if (p) {} else if (q) {} const r = p ? 1 : 2;'), [
      "Function 'f': 1/0/6",
    ]);
  });

  it('counts a logical expression that is also a test twice', () => {
    assert.deepEqual(body('if (p && q) {}'), ["Function 'f': 0/0/2"]);
  });

  it('counts cases, loops over keys and values, a catch, logical assignment and optional chaining', () => {
    assert.deepEqual(
      body('switch (p) { case 1: default: } for (const k in p) {} for (const v of q) {} try {} catch {} p ||= 1; p &&= 1; p ??= 1; p?.a; p?.();'),
      ["Function 'f': 3/1/10"],
    );
  });

  it('gives a nested function its own counts, a scored position included', () => {
    assert.deepEqual(counts('function f(p) { g(); return p ? 1 : () => p && h(); }'), [
      "Function 'f': 0/1/1",
      'Arrow function: 0/1/2',
    ]);
  });

  it('scores functions only, not class field initializers or static blocks', () => {
    assert.deepEqual(counts('class A { x = g(); static { if (A) {} } m() { return 1; } }'), ["Method 'm': 0/0/0"]);
  });
});
