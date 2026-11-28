import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  halsteadVolume,
  measure,
  parseSource,
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

/** Each function as `<name>: <length>/<vocabulary>`. */
function counts(text: string): string[] {
  return measure(sourceOf(text), [halsteadVolume])
    .of(halsteadVolume)
    .map(
      ({ unit, value }) =>
        `${unitName(unit)}: ${String(value.length)}/${String(value.vocabulary)}`,
    );
}

describe('halsteadVolume', () => {
  it('counts the tokens a function uses and the distinct ones, leaving out closing brackets', () => {
    assert.deepEqual(counts('function f(a) { return a + 1; }'), [
      "Function 'f': 10/9",
    ]);
  });

  it('multiplies the length by the base-2 logarithm of the vocabulary', () => {
    const [measurement] = measure(sourceOf('function f(a) { return a + 1; }'), [
      halsteadVolume,
    ]).of(halsteadVolume);

    assert.equal(measurement?.value.volume, 10 * Math.log2(9));
  });

  it('leaves a nested function out of the function around it, and counts it on its own', () => {
    assert.deepEqual(counts('function f() { const g = () => 1; }'), [
      "Function 'f': 8/8",
      'Arrow function: 3/3',
    ]);
  });

  it('counts a function inside another by its own tokens only', () => {
    assert.deepEqual(counts('const f = () => () => 1;'), [
      'Arrow function: 2/2',
      'Arrow function: 3/3',
    ]);
  });

  it('leaves out type annotations, type parameters, type arguments and the type of an as, satisfies or cast', () => {
    const text = [
      'function f<T>(a: number): string {',
      '  type U = T;',
      '  interface I { b: U }',
      '  return g<T>(a as unknown, <never>a, a satisfies number);',
      '}',
    ].join('\n');

    assert.deepEqual(counts(text), ["Function 'f': 18/13"]);
  });

  it('tells an operand apart from an operator of the same text', () => {
    assert.deepEqual(counts('function f(o) { delete o.delete; }'), [
      "Function 'f': 10/9",
    ]);
  });

  it('names itself halstead-volume where a run left it out', () => {
    assert.throws(
      () => measure(sourceOf(''), []).of(halsteadVolume),
      /^Error: The metric 'halstead-volume' was not measured/,
    );
  });

  it('refuses a source parsed without tokens', () => {
    const { ast, text } = sourceOf('function f() {}');
    const bare: Source = {
      file: 'bare.ts',
      text,
      ast: { ...ast, tokens: undefined },
    };

    assert.throws(() => measure(bare, [halsteadVolume]), {
      message:
        'halstead-volume needs the tokens of bare.ts, which its parse left out.',
    });
  });
});
