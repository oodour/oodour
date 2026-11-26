import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { manualDispatch, measure, parseSource, type Source } from '../index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Each chain as `<line>: <subject>`. */
function chains(text: string): string[] {
  return measure(sourceOf(text), [manualDispatch])
    .of(manualDispatch)
    .flatMap(({ value }) => value.map(({ node, subject }) => `${String(node.loc.start.line)}: ${subject}`));
}

describe('manualDispatch', () => {
  it('finds a chain that tests the class of one subject twice, once at its first if', () => {
    const text = [
      'if (a.b instanceof Dog) {}',
      'else if (x instanceof Cat) {}',
      'else if (a.b instanceof Cat) {}',
      'else if (x instanceof Dog) {}',
    ].join('\n');

    assert.deepEqual(chains(text), ['1: a.b']);
  });

  it('compares subjects as source text', () => {
    assert.deepEqual(chains('if (a .b instanceof Dog) {} else if (a.b instanceof Cat) {}'), []);
  });

  it('leaves out tests for error and built-in classes', () => {
    assert.deepEqual(
      chains('if (e instanceof TypeError) {} else if (e instanceof MyError) {} else if (e instanceof Map) {}'),
      [],
    );
  });

  it('leaves out other tests and a subject tested once', () => {
    assert.deepEqual(chains('if (a instanceof Dog) {} else if (a) {} else if (b instanceof Dog) {}'), []);
  });

  it('finds chains in functions and classes', () => {
    const text = 'class C { m() { if (a instanceof X) {} else if (a instanceof Y) {} } }';

    assert.deepEqual(chains(text), ['1: a']);
  });

  it('starts a chain at an if that is not an else if, even inside another branch', () => {
    const text = 'if (q) { if (a instanceof X) {} else if (a instanceof Y) {} } else { if (b instanceof X) {} else if (b instanceof Y) {} }';

    assert.deepEqual(chains(text), ['1: a', '1: b']);
  });

  it('names itself manual-dispatch where a run left it out', () => {
    assert.throws(() => measure(sourceOf(''), []).of(manualDispatch), /^Error: The metric 'manual-dispatch' was not measured/);
  });
});
