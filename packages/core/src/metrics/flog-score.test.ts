import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flogScore, measure, parseSource, type Source, unitName } from '../index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Each scored function as `<name>: <a>/<b>/<c>`, one decimal each. */
function scores(text: string): string[] {
  return measure(sourceOf(text), [flogScore])
    .of(flogScore)
    .map(({ unit, value: { a, b, c } }) => `${unitName(unit)}: ${a.toFixed(1)}/${b.toFixed(1)}/${c.toFixed(1)}`);
}

describe('flogScore', () => {
  it('counts an assignment, a branch and a call at depth one', () => {
    assert.deepEqual(scores('function f(x) { let y = 0; if (x) { g(); } }'), ["Function 'f': 1.0/1.0/1.1"]);
  });

  it('weighs an event inside a branch more than one at the top', () => {
    assert.deepEqual(scores('function f(x) { if (x) { if (x) { g(); } } }'), ["Function 'f': 0.0/2.1/1.2"]);
  });

  it('weighs eval most, dynamic dispatch next and reflection after', () => {
    assert.deepEqual(scores('function f(o) { eval(o); o[k](); Reflect.has(o, k); o.call(); o.m(); }'), [
      "Function 'f': 0.0/0.0/14.0",
    ]);
  });

  it('counts a magic number but not 0, -1 or a const initializer', () => {
    assert.deepEqual(scores('function f() { const a = 7; let b = 0; b = -1; b = 3; }'), ["Function 'f': 4.0/0.0/0.3"]);
  });

  it('scores a callback argument into the function around it and reports nothing for the callback', () => {
    assert.deepEqual(scores('function f(xs) { xs.map((x) => { if (x) { g(); } }); }'), ["Function 'f': 0.0/2.1/2.2"]);
  });

  it('reports a nested function on its own and leaves it out of the function around it', () => {
    assert.deepEqual(scores('function f() { const g = () => h(); }'), ["Function 'f': 1.0/0.0/0.0", 'Arrow function: 0.0/0.0/1.0']);
  });

  it('goes by its name', () => {
    assert.equal(flogScore.name, 'flog-score');
  });

  it('leaves type-only syntax out', () => {
    assert.deepEqual(scores('function f(x: Array<number>): number { return x as unknown as number; }'), [
      "Function 'f': 0.0/0.0/0.0",
    ]);
  });
});
