import { testRule } from '../testing/rule-testers.ts';
import { flogScore } from './flog-score.ts';

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
