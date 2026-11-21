import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import plugin from '../index.ts';
import { testRule } from '../testing/rule-testers.ts';
import { flagArgument } from './flag-argument.ts';

const ruleId = `${plugin.meta.namespace}/flag-argument`;

test('the recommended preset reports a flag argument with a message that names the smell, the parameter and the cures', () => {
  const config = defineConfig({ files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } }, plugin.configs.recommended);
  const messages = new Linter({ configType: 'flat' })
    .verify('function render(compact: boolean) { if (compact) { return 1; } return 2; }', config, 'render.ts')
    .filter((message) => message.ruleId === ruleId)
    .map(({ message }) => message);

  assert.deepEqual(messages, [
    "Stop and look: Flag Argument, the function 'render' branches on its parameter 'compact'. Look for callers that " +
      'pass a constant to choose a path. Cure: Remove Flag Argument, a named function for each value; or, when each ' +
      'value stands for a kind of behaviour, pass in an object of that kind and send it a message. No automatic ' +
      'change: which functions or objects take over each value is a design choice.',
  ]);
});

new RuleTester({
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: join(import.meta.dirname, '..', '..', 'tests', 'typed-fixture') },
  },
}).run('flag-argument with type information', flagArgument, {
  valid: [
    {
      name: 'a parameter whose type is not a set of constants',
      code: 'function render(count: number) { if (count) { return 1; } return 2; }',
    },
    {
      name: 'a parameter whose named type is a union of a literal and a type that is not one',
      code: "type Choice = 'fast' | number; function render(mode: Choice) { if (mode) { return 1; } return 2; }",
    },
  ],
  invalid: [
    {
      name: 'a parameter whose named type is a union of literals, tested by a switch',
      code: "type Mode = 'fast' | 'safe'; function render(mode: Mode) { switch (mode) { case 'fast': return 1; default: return 2; } }",
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'mode' } }],
    },
    {
      name: 'a parameter whose named type is boolean, tested by an if',
      code: 'type Compact = boolean; function render(compact: Compact) { if (compact) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
  ],
});

testRule(flagArgument, {
  valid: [
    {
      name: 'a boolean parameter only passed on, stored or returned',
      code: 'function render(compact: boolean) { draw(compact); const kept = compact; return compact; }',
    },
    {
      name: 'a callback passed straight to a call, whose parameters the callee decides',
      code: 'rows.map((selected: boolean) => (selected ? 1 : 2));',
    },
    {
      name: 'the condition of an assertion function, which checks the value rather than choosing logic',
      code: 'function expect(condition: boolean, field: string): asserts condition { if (!condition) { throw new Error(field); } }',
    },
    {
      name: 'a this parameter',
      code: 'function render(this: boolean) { if (this) { return 1; } return 2; }',
    },
    {
      name: 'a factory whose branches only choose which class to create',
      code: "function bottleNumber(count: 0 | 1 | 2) { switch (count) { case 0: return new NoMore(); case 1: return new One(); default: return new Many(count); } }",
    },
    {
      name: 'an untyped parameter tested by an if, which no call in the file passes a literal',
      code: 'function render(compact) { if (compact) { return 1; } return 2; } render(wide);',
    },
    {
      name: 'a callback passed to a call together with other arguments',
      code: 'rows.reduce((total, selected: boolean) => (selected ? total + 1 : total), 0);',
    },
    {
      name: 'a factory with a single return',
      code: 'function make(logged: boolean) { if (logged) { log(); } return new Report(); }',
    },
    {
      name: 'a factory that holds an inner function returning something else',
      code: 'function make(cached: boolean) { const read = () => { return 1; }; if (cached) { return new Cached(read); } return new Report(); }',
    },
    {
      name: 'a parameter with a number default tested by an if',
      code: 'function render(count = 0) { if (count) { return 1; } return 2; }',
    },
    {
      name: 'a parameter typed as a union of a literal and a type that is not one',
      code: "function render(mode: 'fast' | number) { if (mode) { return 1; } return 2; }",
    },
    {
      name: 'a boolean parameter whose type an if tests, not its value',
      code: "function render(compact: boolean) { if (typeof compact === 'boolean') { return 1; } return 2; }",
    },
    {
      name: 'a boolean parameter that only supplies a fallback to the test',
      code: 'function render(compact: boolean) { if (wide ?? compact) { return 1; } return 2; }',
    },
    {
      name: 'a boolean parameter that a ternary returns but does not test',
      code: 'function render(compact: boolean) { return wide ? compact : false; }',
    },
  ],
  invalid: [
    {
      name: 'a boolean parameter tested by an if',
      code: 'function render(compact: boolean) { if (compact) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'a function that creates an object on one branch only and returns something else on another',
      code: 'function make(cached: boolean) { if (cached) { return lastMade; } return new Report(); }',
      errors: [{ messageId: 'found', data: { function: "function 'make'", name: 'cached' } }],
    },
    {
      name: 'a parameter tested twice is reported once',
      code: 'function render(compact: boolean) { if (compact) { return 1; } return compact ? 2 : 3; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'a parameter with a boolean default tested by an if',
      code: 'function render(compact = false) { if (compact) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'a boolean parameter compared to a literal in an if',
      code: 'function render(compact: boolean) { if (compact === false) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'a parameter with a string default compared in an if',
      code: "function render(mode = 'fast') { if (mode === 'safe') { return 1; } return 2; }",
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'mode' } }],
    },
    {
      name: 'a comparison of the parameter joined with another condition in an if',
      code: "function render(mode: 'fast' | 'safe', wide) { if (wide && mode === 'fast') { return 1; } return 2; }",
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'mode' } }],
    },
    {
      name: 'a parameter typed as a union of string literals compared in an if',
      code: "function render(mode: 'fast' | 'safe') { if (mode === 'fast') { return 1; } return 2; }",
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'mode' } }],
    },
    {
      name: 'a literal-union parameter that a switch tests',
      code: "function render(mode: 'fast' | 'safe') { switch (mode) { case 'fast': return 1; default: return 2; } }",
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'mode' } }],
    },
    {
      name: 'a boolean parameter that a ternary tests',
      code: 'const render = (compact: boolean) => (compact ? 1 : 2);',
      errors: [{ messageId: 'found', data: { function: "arrow function 'render'", name: 'compact' } }],
    },
    {
      name: 'a boolean parameter that a loop tests',
      code: 'function poll(waiting: boolean) { while (waiting) { waiting = check(); } }',
      errors: [{ messageId: 'found', data: { function: "function 'poll'", name: 'waiting' } }],
    },
    {
      name: 'a boolean parameter negated in an if',
      code: 'function render(compact: boolean) { if (!compact) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'a boolean parameter joined with another condition in an if',
      code: 'function render(compact: boolean, wide) { if (wide && compact) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'an untyped parameter tested by an if, to which a call in the file passes a literal',
      code: 'function render(compact) { if (compact) { return 1; } return 2; } render(true);',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'an untyped parameter a switch tests, to which a call in the file passes a string',
      code: "function render(size, mode) { switch (mode) { case 'fast': return size; default: return 0; } } render(1, 'fast');",
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'mode' } }],
    },
    {
      name: 'an untyped parameter compared in an if, to which a call in the file passes a number',
      code: 'function render(level) { if (level === 2) { return 1; } return 0; } render(2);',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'level' } }],
    },
    {
      name: 'an arrow function held by a const, to which a call in the file passes a literal',
      code: 'const render = (compact) => (compact ? 1 : 2); render(false);',
      errors: [{ messageId: 'found', data: { function: "arrow function 'render'", name: 'compact' } }],
    },
    {
      name: 'a method that a sibling method calls with a literal',
      code: 'class Page { show() { return this.render(true); } render(compact) { return compact ? 1 : 2; } }',
      errors: [{ messageId: 'found', data: { function: "method 'render'", name: 'compact' } }],
    },
    {
      name: 'an object literal method that a call in the file passes a literal',
      code: 'const page = { render(compact) { return compact ? 1 : 2; } }; page.render(true);',
      errors: [{ messageId: 'found', data: { function: "method 'render'", name: 'compact' } }],
    },
    {
      name: 'a function called where it is written, which is not a callback',
      code: '((compact: boolean) => (compact ? 1 : 2))(true);',
      errors: [{ messageId: 'found', data: { function: 'arrow function', name: 'compact' } }],
    },
    {
      name: 'a parameter of an assertion function other than the one it asserts',
      code: 'function expect(condition: boolean, strict: boolean): asserts condition { if (strict) { log(); } if (!condition) { throw new Error(); } }',
      errors: [{ messageId: 'found', data: { function: "function 'expect'", name: 'strict' } }],
    },
    {
      name: 'a boolean parameter that the body declares again with var',
      code: 'function render(compact: boolean) { var compact; if (compact) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'a boolean parameter compared with !== in an if',
      code: 'function render(compact: boolean) { if (compact !== false) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'a boolean parameter compared with == in an if',
      code: 'function render(compact: boolean) { if (compact == false) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
    {
      name: 'a boolean parameter compared with != in an if',
      code: 'function render(compact: boolean) { if (compact != false) { return 1; } return 2; }',
      errors: [{ messageId: 'found', data: { function: "function 'render'", name: 'compact' } }],
    },
  ],
});
