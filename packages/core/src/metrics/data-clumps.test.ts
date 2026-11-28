import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  dataClumps,
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

/** Each clump as `<unit>: <names> in <line of each holder>`. */
function clumps(text: string): string[] {
  return measure(sourceOf(text), [dataClumps])
    .of(dataClumps)
    .flatMap(({ unit, value }) =>
      value.map(
        ({ names, holders }) =>
          `${unitName(unit)}: ${names.join(', ')} in ${holders.map(({ node }) => String(node.loc.start.line)).join(' ')}`,
      ),
    );
}

describe('dataClumps', () => {
  it('finds the largest group of names three functions of a module take, not the smaller groups inside it', () => {
    const text = [
      'function a(x, y, z) {}',
      'export const b = (y, x, z, w) => {};',
      'export default function (z = 1, x, y) {}',
      'function d(x, y) {}',
    ].join('\n');

    // Functions with the same names come together, after the first of them: 1 and 3 take x, y, z; 2 adds w.
    assert.deepEqual(clumps(text), ['File: x, y, z in 1 3 2']);
  });

  it('finds groups among the methods and function-valued fields of a class, on its own', () => {
    const text = [
      'function top(a, b) {}',
      'class C {',
      '  m(a, b) {}',
      '  f = (a, b) => {};',
      '  g = function (this: C, a, b) {};',
      '  abstract n(a, b): void;',
      '}',
    ].join('\n');

    assert.deepEqual(clumps(text), ["Class 'C': a, b in 3 4 5"]);
  });

  it('leaves out nested functions, destructured and rest parameters', () => {
    const text = [
      'function a(x, y) { function inner(x, y) {} }',
      'function b({ x }, y) {}',
      'function c(...x) {}',
      'const d = (x, y) => {};',
    ].join('\n');

    assert.deepEqual(clumps(text), []);
    assert.deepEqual(measure(sourceOf(text), [dataClumps]).of(dataClumps), []);
  });

  it('names itself data-clumps where a run left it out', () => {
    assert.throws(
      () => measure(sourceOf(''), []).of(dataClumps),
      /^Error: The metric 'data-clumps' was not measured/,
    );
  });
});
