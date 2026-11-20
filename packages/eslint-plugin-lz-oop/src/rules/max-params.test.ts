import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import plugin from '../index.ts';
import { testRule } from '../testing/rule-testers.ts';
import { maxParams } from './max-params.ts';

const ruleId = `${plugin.meta.namespace}/max-params`;

function lint(code: string, options: Record<string, unknown>): readonly string[] {
  const config = defineConfig(plugin.configs.recommended, { rules: { [ruleId]: ['error', options] } });

  return new Linter({ configType: 'flat' })
    .verify(code, config)
    .filter((message) => message.ruleId === ruleId)
    .map(({ message }) => message);
}

test('max-params rejects an option it does not know', () => {
  assert.throws(() => lint('', { max: 4, limit: 4 }), /additional properties/);
});

test('max-params accepts a limit of zero and rejects a negative one', () => {
  assert.equal(lint('function f(a) {}', { max: 0 }).length, 1);
  assert.throws(() => lint('', { max: -1 }), /should be >= 0/);
});

test('max-params describes what it counts', () => {
  assert.equal(
    maxParams.meta.docs.description,
    'Report a function that depends on more values than allowed, counting the keys read from an untyped or ' +
      'inline-typed options object',
  );
});

test('max-params reports positional parameters with a message that names the smell, the count and the cure', () => {
  assert.deepEqual(lint('function f(a, b) {}', { max: 1 }), [
    "Stop and look: Long Parameter List, function 'f' takes 2 parameters (at most 1). Look for values that travel " +
      'together, or a flag that picks the behaviour. Cure: Introduce Parameter Object, Preserve Whole Object, or ' +
      'Remove Flag Argument; moving the same values into an options object does not cure it. No automatic change: ' +
      'which pieces to split out, and their names, are for a person to choose.',
  ]);
});

test('max-params reports options keys with a message that says how many of the count are keys', () => {
  assert.deepEqual(lint('function f({ a }, b) {}', { max: 1 }), [
    "Stop and look: Long Parameter List, function 'f' takes 2 parameters, 1 of them keys read from an options " +
      'object (at most 1). Look for values that travel together, or a flag that picks the behaviour. Cure: Introduce ' +
      'Parameter Object, Preserve Whole Object, or Remove Flag Argument; moving the same values into an options ' +
      'object does not cure it. No automatic change: which pieces to split out, and their names, are for a person to ' +
      'choose.',
  ]);
});

testRule(maxParams, {
  valid: [
    {
      name: 'a this parameter does not count',
      code: 'function f(this: void, a: number, b: number, c: number, d: number) {}',
    },
    {
      name: 'the max option raises the limit',
      code: 'function f(a, b, c, d, e) {}',
      options: [{ max: 5 }],
    },
    {
      name: 'an object passed on whole counts as one parameter, whatever keys the body reads',
      code: 'function f(options, x) { g(options); return options.a + options.b + options.c + options.d + x; }',
    },
    {
      name: 'an object the body sends a message to counts as one parameter, whatever keys the body reads',
      code: 'function f(options, x) { options.a(); return options.b + options.c + options.d + x; }',
    },
    {
      name: 'an object read by a key computed at run time counts as one parameter',
      code: 'function f(options, key, x) { return options[key] + options.a + options.b + options.c + x; }',
    },
    {
      name: 'a parameter of a named type counts as one parameter, whatever keys the body reads',
      code: 'function f(options: Options) { return options.a + options.b + options.c + options.d + options.e; }',
    },
    {
      name: 'a callback passed as an argument that destructures its item is not checked',
      code: 'rows.map(({ id, name, price, stock, vendor }) => id + name + price + stock + vendor);',
    },
    {
      name: 'a callback passed as an argument that reads keys of its item is not checked',
      code: 'items.forEach((item) => { log(item.a + item.b + item.c + item.d + item.e); });',
    },
    {
      name: 'a callback passed beside another argument is not checked',
      code: 'run(other, function (a, b, c, d, e) {});',
    },
    {
      name: 'a key read again counts once',
      code: 'function f(options, x, y, z) { return options.a + options.a + x + y + z; }',
    },
    {
      name: 'an object returned whole counts as one parameter',
      code: 'function f(options, x) { log(options.a + options.b + options.c + options.d + x); return options; }',
    },
    {
      name: 'an object spread into another counts as one parameter',
      code: 'function f(options, x) { return { ...options, sum: options.a + options.b + options.c + options.d + x }; }',
    },
    {
      name: 'an object assigned on whole counts as one parameter',
      code: 'function f(options, x) { const kept = options; return options.a + options.b + options.c + options.d + x; }',
    },
  ],
  invalid: [
    {
      name: 'five positional parameters are more than the default four',
      code: 'function f(a, b, c, d, e) {}',
      errors: [{ messageId: 'found', data: { name: "function 'f'", count: 5, max: 4 } }],
    },
    {
      name: 'each key destructured in the signature counts as a parameter',
      code: 'function f({ a, b, c }, d, e) {}',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 3, max: 4 } }],
    },
    {
      name: 'each element destructured from an array in the signature counts as a parameter',
      code: 'function f([a, b, c], d, e) {}',
      errors: [{ messageId: 'found', data: { name: "function 'f'", count: 5, max: 4 } }],
    },
    {
      name: 'each key the body reads from an options object counts as a parameter',
      code: 'function f(options, x) { return options.a + options.b + options.c + options.d + x; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 4, max: 4 } }],
    },
    {
      name: 'a key read with a literal in brackets counts as a parameter',
      code: "function f(options, x) { return options['a'] + options.b + options['c'] + options.d + x; }",
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 4, max: 4 } }],
    },
    {
      name: 'each key the body destructures from an options object counts as a parameter',
      code: 'function f(options, x, y) { const { a, b, c } = options; return a + b + c + x + y; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 3, max: 4 } }],
    },
    {
      name: 'each key a destructuring assignment takes from an options object counts as a parameter',
      code: 'function f(options, x, y) { let a, b, c; ({ a, b, c } = options); return a + b + c + x + y; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 3, max: 4 } }],
    },
    {
      name: 'keys a nested function reads from an options object count for the outer function',
      code: 'function f(options, x) { return () => options.a + options.b + options.c + options.d + x; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 4, max: 4 } }],
    },
    {
      name: 'keys read from an options object with a default value count as parameters',
      code: 'function f(options = {}, x) { return options.a + options.b + options.c + options.d + x; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 4, max: 4 } }],
    },
    {
      name: 'keys read from a parameter of an inline object type count as parameters',
      code:
        'function f(options: { a: number; b: number; c: number; d: number; e: number }) { ' +
        'return options.a + options.b + options.c + options.d + options.e; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 5, max: 4 } }],
    },
    {
      name: 'keys read from an untyped parameter count as parameters',
      code: 'function f(options) { return options.a + options.b + options.c + options.d + options.e; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 5, max: 4 } }],
    },
    {
      name: 'one key read from an options object is reported as a key',
      code: 'function f(options, a, b, c, d) { return options.x + a + b + c + d; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 1, max: 4 } }],
    },
    {
      name: 'a function called where it is defined is still checked',
      code: '(function f(a, b, c, d, e) {})();',
      errors: [{ messageId: 'found', data: { name: "function 'f'", count: 5, max: 4 } }],
    },
    {
      name: 'an array pattern adds no options keys',
      code: 'function f([a, b], { c, d, e }) {}',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 3, max: 4 } }],
    },
    {
      name: 'keys passed on as call arguments count as keys read',
      code: 'function f(options) { log(options.a, options.b, options.c, options.d, options.e); }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 5, max: 4 } }],
    },
    {
      name: 'a var that redeclares the parameter reads keys from the same object',
      code: 'function f(options) { var options; return options.a + options.b + options.c + options.d + options.e; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 5, max: 4 } }],
    },
    {
      name: 'an empty object pattern counts as one parameter',
      code: 'function f({}, a, b, c, d) {}',
      errors: [{ messageId: 'found', data: { name: "function 'f'", count: 5, max: 4 } }],
    },
    {
      name: 'the rest of a body destructuring counts as one key',
      code: 'function f(options, x, y) { const { a, b, ...rest } = options; return [a, b, rest, x, y]; }',
      errors: [{ messageId: 'foundKeys', data: { name: "function 'f'", count: 5, keys: 3, max: 4 } }],
    },
    {
      name: 'a declared function without a name is named by its kind',
      code: 'export default function (a: number, b: number, c: number, d: number, e: number): void;',
      errors: [{ messageId: 'found', data: { name: 'function', count: 5, max: 4 } }],
    },
    {
      name: 'a declared function without a body counts its parameters',
      code: 'declare function f(a: number, b: number, c: number, d: number, e: number): void;',
      errors: [{ messageId: 'found', data: { name: "function 'f'", count: 5, max: 4 } }],
    },
  ],
});
