import assert from 'node:assert/strict';
import { test } from 'node:test';
import { abcSize, complexity, type Metric } from '@oodour/core';
import * as parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { defineMetricRule } from './define-metric-rule.ts';
import { sizeRemedy } from './wrap-rule.ts';

const docs = {
  description: 'Report each unit with its value',
  concept: 'Long Function',
  cures: ['Extract Function'],
  requiresTypeChecking: false,
  remedy: sizeRemedy,
  tier: 'strict',
} as const;

/** A rule that reports every unit of its metric with the value it measured. */
function reportingEach<TValue>(name: string, metric: Metric<TValue>) {
  return defineMetricRule<[], 'found', TValue>({
    name,
    metric,
    meta: { type: 'suggestion', docs, messages: { found: '{{value}}' }, schema: [], defaultOptions: [] },
    check({ unit, value }, context) {
      context.report({ node: unit.node, messageId: 'found', data: { value: JSON.stringify(value) } });
    },
  });
}

const rules = { abc: reportingEach('abc', abcSize), paths: reportingEach('paths', complexity) };
const registered = { meta: { name: 'metric-rules' }, rules };
// Typed without `rules`, as the plugin's own default export is, so ESLint's `Plugin` type accepts it.
const metricRules: { readonly meta: { readonly name: string } } = registered;

function lint(enabled: readonly (keyof typeof rules)[], code: string): string[] {
  return new Linter()
    .verify(code, [
      {
        files: ['**'],
        languageOptions: { parser },
        plugins: { m: metricRules },
        rules: Object.fromEntries(enabled.map((rule) => [`m/${rule}`, 'error'])),
      },
    ])
    .map(({ ruleId, message, line }) => `${String(line)} ${String(ruleId)} ${message.split(' No automatic')[0] ?? ''}`);
}

test('two metric rules on one file each report their own metric', () => {
  const code = 'function f(p) {\n  return p ? g() : 2;\n}\nclass A { x = 1 ?? 2; }';

  assert.deepEqual(lint(['abc', 'paths'], code), [
    '1 m/abc {"assignments":0,"sends":1,"conditions":2}',
    '1 m/paths 2',
    '4 m/paths 2',
  ]);
});

test('a metric rule alone reports what it reports beside another', () => {
  assert.deepEqual(lint(['paths'], 'function f(p) { return p ? 1 : 2; }'), ['1 m/paths 2']);
});

test('a disable comment silences a metric rule for its line', () => {
  assert.deepEqual(lint(['paths'], '// eslint-disable-next-line m/paths\nfunction f() {}'), []);
});
