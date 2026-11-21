import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import plugin from '../index.ts';
import { testRule } from '../testing/rule-testers.ts';
import { flogScore } from './flog-score.ts';

const ruleId = `${plugin.meta.namespace}/flog-score`;

function lint(code: string, options: Record<string, unknown>): readonly string[] {
  const config = defineConfig(plugin.configs.recommended, { rules: { [ruleId]: ['error', options] } });

  return new Linter({ configType: 'flat' })
    .verify(code, config)
    .filter((message) => message.ruleId === ruleId)
    .map(({ message }) => message);
}

test('flog-score rejects an option it does not know', () => {
  assert.throws(() => lint('', { max: 25, limit: 25 }), /additional properties/);
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
const scored = (body: string, [a, b, c]: readonly [string, string, string], score: string) => ({
  code: `function f(p, q) { ${body} }`,
  options: [{ max: 0 }] satisfies [{ max: number }],
  errors: [{ messageId: 'found' as const, data: { name: "function 'f'", score, a, b, c, max: 0 } }],
});

testRule(flogScore, {
  valid: [`function f() { ${'g();'.repeat(25)} }`],
  invalid: [
    {
      code: `function f() { ${'g();'.repeat(26)} }`,
      errors: [
        { messageId: 'found', data: { name: "function 'f'", score: '26.0', a: '0.0', b: '0.0', c: '26.0', max: 25 } },
      ],
    },
    scored('g();', ['0.0', '0.0', '1.0'], '1.0'),
    scored('if (p) { g(); } else { h(); }', ['0.0', '1.0', '2.2'], '2.4'),
    scored('g(h());', ['0.0', '0.0', '2.2'], '2.2'),
    scored('new G(h());', ['0.0', '0.0', '2.2'], '2.2'),
    scored('p.g().h();', ['0.0', '0.0', '2.2'], '2.2'),
    scored('p.g()?.h();', ['0.0', '0.0', '2.3'], '2.3'),
    scored('const x = 1; p++;', ['2.0', '0.0', '0.0'], '2.0'),
    scored('let x = 2;', ['1.0', '0.0', '0.3'], '1.0'),
    scored('p = q + 1;', ['1.0', '0.0', '1.3'], '1.6'),
    scored('p += 1; q = 0; q = -1;', ['3.0', '0.0', '1.3'], '3.3'),
    scored('return p && g();', ['0.0', '1.0', '1.1'], '1.5'),
    scored('return p ? g() : h();', ['0.0', '1.0', '2.2'], '2.4'),
    scored('switch (p) { case q: g(); break; default: h(); }', ['0.0', '2.1', '2.3'], '3.1'),
    scored('while (p) { g(); }', ['0.0', '1.0', '1.1'], '1.5'),
    scored('for (const x of p) { g(x); }', ['0.0', '1.0', '1.1'], '1.5'),
    scored('for (let i = 0; i < p; i++) { g(); }', ['2.1', '1.0', '2.2'], '3.2'),
    scored('try { g(); } catch { h(); }', ['0.0', '1.0', '2.1'], '2.3'),
    scored('p ??= q;', ['1.0', '1.0', '0.0'], '1.4'),
    scored('p.map((x) => g(x));', ['0.0', '1.0', '2.1'], '2.3'),
    scored('if (p) { g(); h(); }', ['0.0', '1.0', '2.4'], '2.6'),
    scored('eval(p); new Function(p);', ['0.0', '0.0', '10.0'], '10.0'),
    scored('g.call(p); g.apply(p); g.bind(p); p[q]();', ['0.0', '0.0', '12.0'], '12.0'),
    scored('p.reduce(g); Reflect.get(p, q); Object.defineProperty(p, q, {}); new Proxy(p, {});', ['0.0', '0.0', '8.0'], '8.0'),
    scored('Object.defineProperties(p, {}); Object.setPrototypeOf(p, q); Object.keys(p); q.setPrototypeOf(p);', ['0.0', '0.0', '6.0'], '6.0'),
    scored('p = -2; q = +1;', ['2.0', '0.0', '0.5'], '2.1'),
    scored("g('x');", ['0.0', '0.0', '1.0'], '1.0'),
    scored('g()();', ['0.0', '0.0', '2.0'], '2.0'),
    scored('p ||= q; p &&= q;', ['2.0', '2.0', '0.0'], '2.8'),
    scored('p[g()] += 1;', ['1.0', '0.0', '2.3'], '2.5'),
    scored('if (g()) {}', ['0.0', '1.0', '1.0'], '1.4'),
    scored('switch (g()) { case h(): break; }', ['0.0', '2.1', '2.1'], '3.0'),
    scored('switch (p) { case q: break; }', ['0.0', '2.1', '0.0'], '2.1'),
    scored('for (const x of g()) {}', ['0.0', '1.0', '1.0'], '1.4'),
    scored('try {} catch ({ message = g() }) {}', ['0.0', '1.0', '1.0'], '1.4'),
    scored('new G(() => g());', ['0.0', '1.0', '2.1'], '2.3'),
    scored('g(p, () => h());', ['0.0', '1.0', '2.1'], '2.3'),
    {
      code: 'function f(p) { (() => g())(p); }',
      options: [{ max: 0 }],
      errors: [
        { messageId: 'found', data: { name: "function 'f'", score: '1.0', a: '0.0', b: '0.0', c: '1.0', max: 0 } },
        { messageId: 'found', data: { name: 'arrow function', score: '1.0', a: '0.0', b: '0.0', c: '1.0', max: 0 } },
      ],
    },
    {
      code: 'function f() { const h = function () { g(); }; }',
      options: [{ max: 0 }],
      errors: [
        { messageId: 'found', data: { name: "function 'f'", score: '1.0', a: '1.0', b: '0.0', c: '0.0', max: 0 } },
        { messageId: 'found', data: { name: "function 'h'", score: '1.0', a: '0.0', b: '0.0', c: '1.0', max: 0 } },
      ],
    },
    scored('let x: 5 = 0;', ['1.0', '0.0', '0.0'], '1.0'),
    scored('return g() as 5;', ['0.0', '0.0', '1.0'], '1.0'),
    {
      code: 'function f() { const h = () => g(); }',
      options: [{ max: 0 }],
      errors: [
        { messageId: 'found', data: { name: "function 'f'", score: '1.0', a: '1.0', b: '0.0', c: '0.0', max: 0 } },
        { messageId: 'found', data: { name: "arrow function 'h'", score: '1.0', a: '0.0', b: '0.0', c: '1.0', max: 0 } },
      ],
    },
  ],
});
