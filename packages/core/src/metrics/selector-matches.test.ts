import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defineSelectorMetric, measure, parseSource } from '../index.ts';

function matches(
  selectors: readonly [string, ...string[]],
  text: string,
): string[] {
  const metric = defineSelectorMetric('test-selectors', selectors);
  const source = parseSource(text, 'file.ts');

  assert.ok(!('parseError' in source));

  return measure(source, [metric])
    .of(metric)
    .flatMap(({ value }) => value)
    .map((node) => text.slice(...node.range));
}

describe('defineSelectorMetric', () => {
  it('finds the nodes each selector matches, selector by selector, a node two of them match twice', () => {
    assert.deepEqual(
      matches(
        ["Program > VariableDeclaration[kind='let']", 'Identifier[name=b]'],
        'let a; let b;',
      ),
      ['let a;', 'let b;', 'b'],
    );
  });

  it('matches with ancestry and TypeScript nodes', () => {
    assert.deepEqual(
      matches(
        ['PropertyDefinition[optional=true] > PrivateIdentifier'],
        'class C { #a?: number; b = 1; }',
      ),
      ['#a'],
    );
  });

  it('has no measurement for a file it matches nothing in', () => {
    const metric = defineSelectorMetric('test-selectors', ['SwitchStatement']);
    const source = parseSource('f();', 'file.ts');

    assert.ok(!('parseError' in source));
    assert.deepEqual(measure(source, [metric]).of(metric), []);
  });

  it('refuses a child step inside :has, which esquery matches nothing for', () => {
    assert.throws(
      () => defineSelectorMetric('bad', ['A:has(> B > C)']),
      /^Error: bad: "A:has\(> B > C\)" puts a child step/,
    );
    assert.throws(
      () => defineSelectorMetric('bad', ['A:has( > B > C)']),
      /puts a child step/,
    );
    assert.doesNotThrow(() => defineSelectorMetric('fine', ['A:has(B > C)']));
  });
});
