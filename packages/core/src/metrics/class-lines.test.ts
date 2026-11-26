import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classLines, measure, parseSource, type Source, unitName } from '../index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Each class as `<name>: <code>/<comments>/<blank>`. */
function lines(text: string): string[] {
  return measure(sourceOf(text), [classLines])
    .of(classLines)
    .map(({ unit, value }) => `${unitName(unit)}: ${[value.code, value.comments, value.blank].join('/')}`);
}

describe('classLines', () => {
  it('splits a class into lines of code, comment-only lines and blank lines', () => {
    assert.deepEqual(lines('class A {\n  // note\n\n  x = 1;\n  /* a\n  b */\n}'), ["Class 'A': 3/3/1"]);
  });

  it('counts each line a multi-line token spans as code', () => {
    assert.deepEqual(lines('class A {\n  x = `a\n\nb`;\n}'), ["Class 'A': 5/0/0"]);
  });

  it('counts a line with code and a comment as code', () => {
    assert.deepEqual(lines('class A { // note\n}'), ["Class 'A': 2/0/0"]);
  });

  it('leaves out the tokens and comments around the class on its first and last lines', () => {
    assert.deepEqual(lines('/* before */ class A {\n\n} // after\n// next'), ["Class 'A': 2/0/1"]);
  });

  it('splits lines where ESLint splits them', () => {
    assert.deepEqual(lines('class A {\r\n\r\n x = 1;\u2028\u2029}'), ["Class 'A': 3/0/2"]);
  });

  it('measures a class inside a class on its own', () => {
    assert.deepEqual(lines('class A {\n  b = class {\n\n  };\n}'), ["Class 'A': 4/0/1", 'Anonymous class: 2/0/1']);
  });

  it('names itself class-lines where a run left it out', () => {
    assert.throws(() => measure(sourceOf(''), []).of(classLines), /^Error: The metric 'class-lines' was not measured/);
  });

  it('refuses a source parsed without tokens and comments', () => {
    const { ast, text } = sourceOf('class A {}');
    const bare: Source = { file: 'bare.ts', text, ast: { ...ast, tokens: undefined, comments: undefined } };

    assert.throws(() => measure(bare, [classLines]), {
      message: 'class-lines needs the tokens and comments of bare.ts, which its parse left out.',
    });
  });
});
