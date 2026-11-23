import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionComplexity } from './complexity.ts';

test("each function's complexity is the count ESLint's complexity rule gives it, at its first line", () => {
  const text = ['function plain() {}', 'function branching(a: number) {', '  return a > 0 ? 1 : 2;', '}'].join('\n');

  assert.deepEqual(functionComplexity('a.ts', text), [
    { name: "Function 'plain'", line: 1, complexity: 1 },
    { name: "Function 'branching'", line: 2, complexity: 2 },
  ]);
});

test('a class field whose value is a function counts once', () => {
  const text = 'class A {\n  handle = (a: number) => (a ? 1 : 2);\n}';

  assert.deepEqual(functionComplexity('a.ts', text), [{ name: "Method 'handle'", line: 2, complexity: 2 }]);
});

test('JSX in a JavaScript file and a type assertion in a TypeScript file both parse', () => {
  assert.deepEqual(functionComplexity('a.js', 'const view = () => <p>{1}</p>;'), [
    { name: 'Arrow function', line: 1, complexity: 1 },
  ]);
  assert.deepEqual(functionComplexity('b.ts', 'const size = (a: unknown) => (<string>a).length;'), [
    { name: 'Arrow function', line: 1, complexity: 1 },
  ]);
});

test('a file the parser cannot read is refused with the place it stopped', () => {
  assert.throws(() => functionComplexity('src/a.ts', 'function (\n'), /^Error: src\/a\.ts:1:\d+ /);
});
