import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { measure, parseSource, repeatedSwitches, type Source, unitName } from '../index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Each group as `<unit>: <cases> at <line of each switch>`. */
function groups(text: string): string[] {
  return measure(sourceOf(text), [repeatedSwitches])
    .of(repeatedSwitches)
    .flatMap(({ unit, value }) =>
      value.map(({ cases, switches }) => `${unitName(unit)}: ${cases} at ${switches.map((node) => node.loc.start.line).join(' ')}`),
    );
}

describe('repeatedSwitches', () => {
  it('groups switches on the same case labels in any order, without default', () => {
    const text = [
      'switch (a) { case 1: case 2: }',
      'function f() { switch (b) { case 2: default: case 1: } }',
      'class C { m() { switch (c) { case 1: } } }',
    ].join('\n');

    assert.deepEqual(groups(text), ['File: 1, 2 at 1 2']);
  });

  it('compares case labels as source text', () => {
    assert.deepEqual(groups('switch (a) { case x.y: }\nswitch (b) { case x .y: }\nswitch (c) { case x.y: }'), [
      'File: x.y at 1 3',
    ]);
  });

  it('reports each repeated choice of a file on its own', () => {
    const text = 'switch (a) { case 1: }\nswitch (a) { case 2: }\nswitch (a) { case 1: }\nswitch (a) { case 2: }';

    assert.deepEqual(groups(text), ['File: 1 at 1 3', 'File: 2 at 2 4']);
  });

  it('leaves out switches with no case labels', () => {
    assert.deepEqual(groups('switch (a) { default: }\nswitch (b) {}'), []);
  });

  it('has nothing to report for a file whose switches all differ', () => {
    assert.deepEqual(measure(sourceOf('switch (a) { case 1: }\nswitch (b) { case 2: }'), [repeatedSwitches]).of(repeatedSwitches), []);
  });

  it('names itself repeated-switches where a run left it out', () => {
    assert.throws(() => measure(sourceOf(''), []).of(repeatedSwitches), /^Error: The metric 'repeated-switches' was not measured/);
  });
});
