import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import plugin from '../index.ts';
import { testRule } from '../testing/rule-testers.ts';
import { abcSize } from './abc-size.ts';

const ruleId = `${plugin.meta.namespace}/abc-size`;

function lint(code: string, options: Record<string, unknown>): readonly string[] {
  const config = defineConfig(plugin.configs.recommended, { rules: { [ruleId]: ['error', options] } });

  return new Linter({ configType: 'flat' })
    .verify(code, config)
    .filter((message) => message.ruleId === ruleId)
    .map(({ message }) => message);
}

test('abc-size rejects an option it does not know', () => {
  assert.throws(() => lint('', { max: 15, limit: 15 }), /additional properties/);
});

test('abc-size accepts a limit of zero and rejects a negative one', () => {
  assert.equal(lint('function f() { g(); }', { max: 0 }).length, 1);
  assert.throws(() => lint('', { max: -1 }), /should be >= 0/);
});

test('abc-size reports with a message that names the smell, the counts and the cure', () => {
  assert.deepEqual(lint('function f() { g(); }', { max: 0 }), [
    "Stop and look: Long Function, function 'f' has ABC size 1.0 (at most 0) from 0 assignments, 1 sends and 0 " +
      'conditions, more than a reader holds at once. Look at the largest count: assignments are often temporaries, ' +
      'sends are steps or collaborators, conditions are choices. Cure: Extract Function for each step, Replace Temp ' +
      'with Query or Inline Temp, Decompose Conditional, or Replace Conditional with Polymorphism. No automatic ' +
      'change: which pieces to split out, and their names, are for a person to choose.',
  ]);
});

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
