import { testRule } from '../testing/rule-testers.ts';
import { abcSize } from './abc-size.ts';

/** A case reported at limit 0, so its message shows the counts of the one function in `body`. */
const scored = (body: string, [a, b, c]: readonly [number, number, number], size: string) => ({
  code: `function f(p, q) { ${body} }`,
  options: [{ max: 0 }] satisfies [{ max: number }],
  errors: [{ messageId: 'found' as const, data: { name: "function 'f'", size, a, b, c, max: 0 } }],
});

const calls = (count: number): string => `function f() { ${'g();'.repeat(count)} }`;

testRule(abcSize, {
  valid: [calls(15), { code: 'function f(p?: string) {}', options: [{ max: 0 }] }],
  invalid: [
    {
      code: calls(16),
      errors: [{ messageId: 'found', data: { name: "function 'f'", size: '16.0', a: 0, b: 16, c: 0, max: 15 } }],
    },
    {
      code: 'function f() { const h = () => g(); }',
      options: [{ max: 0 }],
      errors: [
        { messageId: 'found', data: { name: "function 'f'", size: '1.0', a: 1, b: 0, c: 0, max: 0 } },
        { messageId: 'found', data: { name: "arrow function 'h'", size: '1.0', a: 0, b: 1, c: 0, max: 0 } },
      ],
    },scored('g();', [0, 1, 0], '1.0'), scored('const x = 1;', [1, 0, 0], '1.0'), scored('p = 1;', [1, 0, 0], '1.0'), scored('p--;', [1, 0, 0], '1.0'), scored('new G();', [0, 1, 0], '1.0'), scored('return p < q;', [0, 0, 1], '1.0'), scored('if (p) {}', [0, 0, 1], '1.0'),
    scored('if (p === q) {}', [0, 0, 1], '1.0'),
    scored('if (p) {} else {}', [0, 0, 2], '2.0'),
    scored('if (p) {} else if (q) {}', [0, 0, 2], '2.0'),
    scored('return p ? 1 : 2;', [0, 0, 2], '2.0'),
    scored('switch (p) { case 1: break; default: }', [0, 0, 2], '2.0'),
    scored('return p ?? q;', [0, 0, 1], '1.0'),
    scored('p ||= 1;', [1, 0, 1], '1.4'),
    scored('if (p && q) {}', [0, 0, 2], '2.0'),
    scored('while (p) {}', [0, 0, 1], '1.0'),
    scored('for (const x of p) {}', [0, 0, 1], '1.0'),
    scored('try {} catch {}', [0, 0, 1], '1.0'),
    scored('return p?.q;', [0, 0, 1], '1.0'),
  ],
});
