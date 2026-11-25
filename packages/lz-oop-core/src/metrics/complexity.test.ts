import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { complexity, measure, parseSource, unitName } from '../index.ts';

function complexities(text: string): string[] {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return measure(source, [complexity])
    .of(complexity)
    .map(({ unit, value }) => `${unitName(unit)}: ${String(value)}`);
}

describe('complexity', () => {
  it('counts one path for a function without branches', () => {
    assert.deepEqual(complexities('function f() { return 1; }'), ["Function 'f': 1"]);
  });

  it('counts each branch construct the rule counts', () => {
    const text = `
      function f(a, b = 1) {
        if (a) {}
        for (;;) {}
        for (const x of a) {}
        for (const x in a) {}
        while (a) {}
        do {} while (a);
        try {} catch {}
        switch (a) { case 1: break; default: break; }
        a ?? b;
        a ||= b;
        a &&= b;
        a ??= b;
        a += b;
        a?.b;
        a?.();
        return a ? 1 : 2;
      }`;

    assert.deepEqual(complexities(text), ["Function 'f': 17"]);
  });

  it('keeps a nested function out of the count of the function around it', () => {
    assert.deepEqual(complexities('function f(a) { if (a) {} return () => (a ? 1 : 2); }'), [
      "Function 'f': 2",
      'Arrow function: 2',
    ]);
  });

  it('counts a class field initializer and a static block as units of their own', () => {
    const text = 'class A { x = this.a ?? 1; static { if (A) {} } m() { return 1; } }';

    assert.deepEqual(complexities(text), ['Class field initializer: 2', 'Class static block: 2', "Method 'm': 1"]);
  });

  it('counts a class field whose value is a function once, as the function', () => {
    assert.deepEqual(complexities('class A { #run = (a) => a ?? 1; }'), ['Private method #run: 2']);
  });

  it('names units as the rule does', () => {
    const text = `
      const o = { get g() { return 1; }, async *s() {}, ['k']: function () {} };
      class A { constructor() {} static async m() {} set v(x) {} accessor f = () => 1; }`;

    assert.deepEqual(complexities(text), [
      "Getter 'g': 1",
      "Async generator method 's': 1",
      "Method 'k': 1",
      'Constructor: 1',
      "Static async method 'm': 1",
      "Setter 'v': 1",
      'Arrow function: 1',
    ]);
  });
});
