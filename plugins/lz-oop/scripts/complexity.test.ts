import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionComplexity } from './complexity.ts';

test("each function's complexity is the count ESLint's complexity rule gives it, at its first line", () => {
  const text = ['function plain() {}', 'function branching(a: number) {', '  return a > 0 ? 1 : 2;', '}'].join('\n');

  assert.deepEqual(functionComplexity('a.ts', text), {
    functions: [
      { name: "Function 'plain'", line: 1, complexity: 1 },
      { name: "Function 'branching'", line: 2, complexity: 2 },
    ],
  });
});

test('a class field whose value is a function counts once', () => {
  const text = 'class A {\n  handle = (a: number) => (a ? 1 : 2);\n}';

  assert.deepEqual(functionComplexity('a.ts', text), { functions: [{ name: "Method 'handle'", line: 2, complexity: 2 }] });
});

test('JSX in a JavaScript file and a type assertion in a TypeScript file both parse', () => {
  assert.deepEqual(functionComplexity('a.js', 'const view = () => <p>{1}</p>;'), {
    functions: [{ name: 'Arrow function', line: 1, complexity: 1 }],
  });
  assert.deepEqual(functionComplexity('b.ts', 'const size = (a: unknown) => (<string>a).length;'), {
    functions: [{ name: 'Arrow function', line: 1, complexity: 1 }],
  });
});

test('a file below a node_modules or .git folder is measured like any other', () => {
  const text = 'const f = (a: number) => (a ? 1 : 2);';

  for (const file of ['vendor/node_modules/x.ts', 'tools/.git/hooks/y.ts']) {
    assert.deepEqual(functionComplexity(file, text), { functions: [{ name: 'Arrow function', line: 1, complexity: 2 }] }, file);
  }
});

test("a file's own ESLint comments neither turn the count off nor read as a parse error", () => {
  const text = '/* eslint lz/complexity: "off" */\n/* eslint-disable */\nconst f = (a: number) => (a ? 1 : 2);';

  assert.deepEqual(functionComplexity('a.ts', text), { functions: [{ name: 'Arrow function', line: 3, complexity: 2 }] });
});

test('a file the parser cannot read gives the place it stopped', () => {
  const result = functionComplexity('src/a.ts', 'function (\n');

  assert.ok('parseError' in result);
  assert.match(result.parseError, /^src\/a\.ts:1:\d+ /);
});
