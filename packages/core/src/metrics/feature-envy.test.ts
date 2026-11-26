import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { featureEnvy, measure, parseSource, type Source } from '../index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Each envy as `<method>: <name> <count>/<own>`. */
function envies(text: string): string[] {
  return measure(sourceOf(text), [featureEnvy])
    .of(featureEnvy)
    .flatMap(({ value }) => value)
    .map(({ method, name, count, own }) => `${text.slice(...method.key.range)}: ${name} ${String(count)}/${String(own)}`);
}

describe('featureEnvy', () => {
  it('reports a method that uses a parameter two more times than its own object', () => {
    assert.deepEqual(envies('class A { m(o) { this.x; return o.a + o.b + o.c; } }'), ['m: o 3/1']);
  });

  it('passes a lead of one', () => {
    assert.deepEqual(envies('class A { m(o) { this.x; return o.a + o.b; } }'), []);
  });

  it('passes a method that never uses its own object, and a static method', () => {
    assert.deepEqual(envies('class A { m(o) { o.a; o.b; o.c; } static s(o) { this.x; o.a; o.b; o.c; } }'), []);
  });

  it('reports only the most used variable, and each one tied for most', () => {
    const text = 'class A { m(o, p, q) { this.x; o.a; o.b; o.c; p.a; p.b; p.c; q.a; q.b; } }';

    assert.deepEqual(envies(text), ['m: o 3/1', 'm: p 3/1']);
  });

  it('counts uses inside a function in the method toward the method', () => {
    assert.deepEqual(envies('class A { m(o) { const f = () => this.x; [1].map(() => o.a + o.b + o.c); } }'), [
      'm: o 3/1',
    ]);
  });

  it('counts a variable holding an own field, or a parameter property, as its own object', () => {
    assert.deepEqual(envies('class A { m() { const c = this.c; c.a; c.b; c.c; } }'), []);
    assert.deepEqual(envies('class A { constructor(private p) {} m() { this.x; this.p; p.a; p.b; p.c; } }'), []);
  });

  it('leaves out a collection or literal the method makes for its own work', () => {
    assert.deepEqual(envies('class A { m() { this.x; const s = new Map(); s.get(1); s.set(1, 2); s.has(1); } }'), []);
    assert.deepEqual(envies('class A { m() { this.x; const s = {}; s.a; s.b; s.c; } }'), []);
  });

  it('leaves out a variable another function declares', () => {
    assert.deepEqual(envies('const o = {}; class A { m() { this.x; o.a; o.b; o.c; } }'), []);
  });

  it('measures a method in a class inside a method on its own', () => {
    const text = 'class A { m(o) { this.x; class B { n(p) { this.y; p.a; p.b; p.c; } } o.a; } }';

    assert.deepEqual(envies(text), ['n: p 3/1']);
  });

  it('counts a use of super as a use of its own object', () => {
    assert.deepEqual(envies('class A extends B { m(o) { super.x(); return o.a + o.b + o.c; } }'), ['m: o 3/1']);
  });

  it('has no measurement for a file without envy, and goes by its name', () => {
    assert.deepEqual(measure(sourceOf('class A { m() { this.x; } }'), [featureEnvy]).of(featureEnvy), []);
    assert.equal(featureEnvy.name, 'feature-envy');
  });

  it('looks through type assertions', () => {
    assert.deepEqual(envies('class A { m(o: unknown) { this.x; (o as any).a; o!.b; (<any>o).c; } }'), ['m: o 3/1']);
  });
});
