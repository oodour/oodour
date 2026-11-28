import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { flogScore } from './flog-score.ts';

const lint = ruleMessages('flog-score');

test('flog-score rejects an option it does not know', () => {
  assert.throws(
    () => lint('', { max: 25, limit: 25 }),
    /additional properties/,
  );
});

test('flog-score accepts a limit of zero and rejects a negative one', () => {
  assert.equal(lint('function f() { g(); }', { max: 0 }).length, 1);
  assert.throws(() => lint('', { max: -1 }), /should be >= 0/);
});

test('flog-score reports with a message that names the smell, the weighted counts and the cure', () => {
  assert.deepEqual(lint('function f() { g(); }', { max: 0 }), [
    "Stop and look: Long Function, function 'f' has Flog score 1.0 (at most 0) from weighted counts of 0.0 " +
      'assignments, 0.0 branches and 1.0 calls; an event weighs more the deeper it is nested, and eval, dynamic ' +
      'dispatch and reflection weigh most. Cure: Extract Function for each nested step, Replace Nested Conditional ' +
      'with Guard Clauses, Decompose Conditional, or a named method in place of a dynamic call. No automatic ' +
      'change: which pieces to split out, and their names, are for a person to choose.',
  ]);
});

/** A case reported at limit 0, so its message shows the weighted counts of the one function `f`. */
const scored = (
  name: string,
  body: string,
  [a, b, c]: readonly [string, string, string],
  score: string,
) => ({
  name,
  code: `function f(p, q) { ${body} }`,
  options: [{ max: 0 }] satisfies [{ max: number }],
  errors: [
    {
      messageId: 'found' as const,
      data: { name: "function 'f'", score, a, b, c, max: 0 },
    },
  ],
});

testRule(flogScore, {
  valid: [`function f() { ${'g();'.repeat(25)} }`],
  invalid: [
    {
      code: `function f() { ${'g();'.repeat(26)} }`,
      errors: [
        {
          messageId: 'found',
          data: {
            name: "function 'f'",
            score: '26.0',
            a: '0.0',
            b: '0.0',
            c: '26.0',
            max: 25,
          },
        },
      ],
    },
    scored('one call weighs 1', 'g();', ['0.0', '0.0', '1.0'], '1.0'),
    scored(
      'calls inside an if and its else weigh more',
      'if (p) { g(); } else { h(); }',
      ['0.0', '1.0', '2.2'],
      '2.4',
    ),
    scored(
      'a call in an argument is nested one level',
      'g(h());',
      ['0.0', '0.0', '2.2'],
      '2.2',
    ),
    scored(
      'a call in a constructor argument is nested one level',
      'new G(h());',
      ['0.0', '0.0', '2.2'],
      '2.2',
    ),
    scored(
      'a chained call is nested one level',
      'p.g().h();',
      ['0.0', '0.0', '2.2'],
      '2.2',
    ),
    scored(
      'an optional chain weighs a little more than a plain one',
      'p.g()?.h();',
      ['0.0', '0.0', '2.3'],
      '2.3',
    ),
    scored(
      'a declaration with a value and an update are assignments',
      'const x = 1; p++;',
      ['2.0', '0.0', '0.0'],
      '2.0',
    ),
    scored(
      'a magic number adds a small call weight',
      'let x = 2;',
      ['1.0', '0.0', '0.3'],
      '1.0',
    ),
    scored(
      'an arithmetic operator weighs as a call',
      'p = q + 1;',
      ['1.0', '0.0', '1.3'],
      '1.6',
    ),
    scored(
      '0 and -1 are not magic numbers',
      'p += 1; q = 0; q = -1;',
      ['3.0', '0.0', '1.3'],
      '3.3',
    ),
    scored(
      'a logical operator is a branch',
      'return p && g();',
      ['0.0', '1.0', '1.1'],
      '1.5',
    ),
    scored(
      'a conditional expression is a branch',
      'return p ? g() : h();',
      ['0.0', '1.0', '2.2'],
      '2.4',
    ),
    scored(
      'each switch case is a branch',
      'switch (p) { case q: g(); break; default: h(); }',
      ['0.0', '2.1', '2.3'],
      '3.1',
    ),
    scored(
      'a while loop is a branch',
      'while (p) { g(); }',
      ['0.0', '1.0', '1.1'],
      '1.5',
    ),
    scored(
      'a for-of loop is a branch',
      'for (const x of p) { g(x); }',
      ['0.0', '1.0', '1.1'],
      '1.5',
    ),
    scored(
      "a for loop is a branch, and its head's assignments count",
      'for (let i = 0; i < p; i++) { g(); }',
      ['2.1', '1.0', '2.2'],
      '3.2',
    ),
    scored(
      'a catch clause is a branch',
      'try { g(); } catch { h(); }',
      ['0.0', '1.0', '2.1'],
      '2.3',
    ),
    scored(
      'a nullish assignment is an assignment and a branch',
      'p ??= q;',
      ['1.0', '1.0', '0.0'],
      '1.4',
    ),
    scored(
      'a callback is a branch and nests its calls',
      'p.map((x) => g(x));',
      ['0.0', '1.0', '2.1'],
      '2.3',
    ),
    scored(
      'calls in an if block weigh more than calls at the top',
      'if (p) { g(); h(); }',
      ['0.0', '1.0', '2.4'],
      '2.6',
    ),
    scored(
      'eval and the Function constructor weigh most',
      'eval(p); new Function(p);',
      ['0.0', '0.0', '10.0'],
      '10.0',
    ),
    scored(
      'dynamic dispatch weighs more than a call',
      'g.call(p); g.apply(p); g.bind(p); p[q]();',
      ['0.0', '0.0', '12.0'],
      '12.0',
    ),
    scored(
      'reduce, Reflect, defineProperty and Proxy weigh as reflection',
      'p.reduce(g); Reflect.get(p, q); Object.defineProperty(p, q, {}); new Proxy(p, {});',
      ['0.0', '0.0', '8.0'],
      '8.0',
    ),
    scored(
      "only Object's reflective methods weigh as reflection",
      'Object.defineProperties(p, {}); Object.setPrototypeOf(p, q); Object.keys(p); q.setPrototypeOf(p);',
      ['0.0', '0.0', '6.0'],
      '6.0',
    ),
    scored(
      'a signed number other than -1 is a magic number',
      'p = -2; q = +1;',
      ['2.0', '0.0', '0.5'],
      '2.1',
    ),
    scored(
      'a string literal is not a magic number',
      "g('x');",
      ['0.0', '0.0', '1.0'],
      '1.0',
    ),
    scored(
      'a call of a call result is two calls',
      'g()();',
      ['0.0', '0.0', '2.0'],
      '2.0',
    ),
    scored(
      'logical assignments are assignments and branches',
      'p ||= q; p &&= q;',
      ['2.0', '2.0', '0.0'],
      '2.8',
    ),
    scored(
      'a call in a computed assignment target is not nested',
      'p[g()] += 1;',
      ['1.0', '0.0', '2.3'],
      '2.5',
    ),
    scored(
      'a call in an if test is not nested',
      'if (g()) {}',
      ['0.0', '1.0', '1.0'],
      '1.4',
    ),
    scored(
      'calls in a switch and its case test are not nested',
      'switch (g()) { case h(): break; }',
      ['0.0', '2.1', '2.1'],
      '3.0',
    ),
    scored(
      'a case test costs no call',
      'switch (p) { case q: break; }',
      ['0.0', '2.1', '0.0'],
      '2.1',
    ),
    scored(
      'a call in a for-of head is not nested',
      'for (const x of g()) {}',
      ['0.0', '1.0', '1.0'],
      '1.4',
    ),
    scored(
      'a call in a catch parameter default is not nested',
      'try {} catch ({ message = g() }) {}',
      ['0.0', '1.0', '1.0'],
      '1.4',
    ),
    scored(
      'a callback passed to a constructor is a branch',
      'new G(() => g());',
      ['0.0', '1.0', '2.1'],
      '2.3',
    ),
    scored(
      'a callback passed as a later argument is a branch',
      'g(p, () => h());',
      ['0.0', '1.0', '2.1'],
      '2.3',
    ),
    {
      code: 'function f(p) { (() => g())(p); }',
      options: [{ max: 0 }],
      errors: [
        {
          messageId: 'found',
          data: {
            name: "function 'f'",
            score: '1.0',
            a: '0.0',
            b: '0.0',
            c: '1.0',
            max: 0,
          },
        },
        {
          messageId: 'found',
          data: {
            name: 'arrow function',
            score: '1.0',
            a: '0.0',
            b: '0.0',
            c: '1.0',
            max: 0,
          },
        },
      ],
    },
    {
      code: 'function f() { const h = function () { g(); }; }',
      options: [{ max: 0 }],
      errors: [
        {
          messageId: 'found',
          data: {
            name: "function 'f'",
            score: '1.0',
            a: '1.0',
            b: '0.0',
            c: '0.0',
            max: 0,
          },
        },
        {
          messageId: 'found',
          data: {
            name: "function 'h'",
            score: '1.0',
            a: '0.0',
            b: '0.0',
            c: '1.0',
            max: 0,
          },
        },
      ],
    },
    scored(
      'a number in a type annotation is not a magic number',
      'let x: 5 = 0;',
      ['1.0', '0.0', '0.0'],
      '1.0',
    ),
    scored(
      'a number in a type assertion is not a magic number',
      'return g() as 5;',
      ['0.0', '0.0', '1.0'],
      '1.0',
    ),
    {
      code: 'function f() { const h = () => g(); }',
      options: [{ max: 0 }],
      errors: [
        {
          messageId: 'found',
          data: {
            name: "function 'f'",
            score: '1.0',
            a: '1.0',
            b: '0.0',
            c: '0.0',
            max: 0,
          },
        },
        {
          messageId: 'found',
          data: {
            name: "arrow function 'h'",
            score: '1.0',
            a: '0.0',
            b: '0.0',
            c: '1.0',
            max: 0,
          },
        },
      ],
    },
  ],
});
