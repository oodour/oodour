import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { isRuleModule } from './testing/installed-rules.ts';
import { optionalPluginRule, sizeRemedy, wrapRule } from './wrap-rule.ts';

const notInstalled = (id: string): never => {
  throw Object.assign(new Error(`Cannot find module '${id}'`), { code: 'MODULE_NOT_FOUND' });
};

test('a rule of a plugin package that is not installed loads as undefined', () => {
  assert.equal(optionalPluginRule('eslint-plugin-absent', 'some-rule', notInstalled), undefined);
});

test('an installed plugin package that fails to load throws its error', () => {
  const broken = (): never => {
    throw new SyntaxError('Unexpected token');
  };

  assert.throws(() => optionalPluginRule('eslint-plugin-broken', 'some-rule', broken), SyntaxError);
});

const wrapperOfMissingRule: unknown = wrapRule({
  name: 'some-limit',
  wraps: 'absent/some-limit',
  upstream: optionalPluginRule('eslint-plugin-absent', 'some-limit', notInstalled),
  docs: { description: 'Some limit', concept: 'Some smell', requiresTypeChecking: false, remedy: sizeRemedy, tier: 'strict' },
  message: 'Some message.',
  defaultOptions: [5],
});

function lintWith(setting: Linter.RuleEntry): readonly Linter.LintMessage[] {
  if (!isRuleModule(wrapperOfMissingRule)) {
    throw new Error('The wrapper is not a rule module.');
  }

  return new Linter().verify('const a = 1;', {
    plugins: { test: { rules: { 'some-limit': wrapperOfMissingRule } } },
    rules: { 'test/some-limit': setting },
  });
}

test('a wrapper of a rule whose plugin is not installed loads, and stays silent while it is off', () => {
  assert.deepEqual(lintWith('off'), []);
});

test('a wrapper of a rule whose plugin is not installed names the rule it wraps when a config turns it on', () => {
  assert.throws(() => lintWith(['error', 7]), /wraps absent\/some-limit, which could not be loaded/);
});
