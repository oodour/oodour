import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { isRuleModule } from './testing/installed-rules.ts';
import {
  optionalPluginRule,
  pluginRule,
  sizeRemedy,
  wrapRule,
  type WrappedRule,
} from './wrap-rule.ts';

const notInstalled = (id: string): never => {
  throw Object.assign(new Error(`Cannot find module '${id}'`), {
    code: 'MODULE_NOT_FOUND',
  });
};

test('a rule of a plugin package that is not installed loads as undefined, under its ID', () => {
  assert.deepEqual(
    optionalPluginRule(
      'absent/',
      'eslint-plugin-absent',
      'some-rule',
      notInstalled,
    ),
    {
      id: 'absent/some-rule',
      module: undefined,
    },
  );
});

test('an installed plugin package that fails to load throws its error', () => {
  const broken = (): never => {
    throw new SyntaxError('Unexpected token');
  };

  assert.throws(
    () =>
      optionalPluginRule(
        'broken/',
        'eslint-plugin-broken',
        'some-rule',
        broken,
      ),
    SyntaxError,
  );
});

test('an installed plugin package that fails to load with another error code throws its error', () => {
  const unreadable = (): never => {
    throw Object.assign(new Error('Operation not permitted'), {
      code: 'EPERM',
    });
  };

  assert.throws(
    () =>
      optionalPluginRule(
        'unreadable/',
        'eslint-plugin-unreadable',
        'some-rule',
        unreadable,
      ),
    {
      code: 'EPERM',
    },
  );
});

test('a plugin package whose rules are not an object has no rule to load', () => {
  assert.equal(
    optionalPluginRule('odd/', 'eslint-plugin-odd', 'some-rule', () => ({
      rules: null,
    })).module,
    undefined,
  );
});

test('a rule of an installed plugin package loads as the module the package holds under its name', () => {
  const someRule = { create: () => ({}) };

  assert.equal(
    optionalPluginRule('some/', 'eslint-plugin-some', 'some-rule', () => ({
      rules: { 'some-rule': someRule },
    })).module,
    someRule,
  );
});

test("a rule of a plugin this package depends on is the plugin's module under its prefixed ID", () => {
  const someRule = { create: () => ({}) };

  assert.deepEqual(
    pluginRule('@some/', { 'some-rule': someRule }, 'some-rule'),
    {
      id: '@some/some-rule',
      module: someRule,
    },
  );
});

function wrapperOf(upstream: WrappedRule): unknown {
  return wrapRule({
    name: 'some-limit',
    upstream,
    docs: {
      description: 'Some limit',
      concept: 'Some smell',
      cures: ['Some cure'],
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'strict',
    },
    message: 'Some message.',
    defaultOptions: [5],
  });
}

function lintWith(
  setting: Linter.RuleEntry,
  upstream: WrappedRule,
): readonly Linter.LintMessage[] {
  const wrapper = wrapperOf(upstream);

  if (!isRuleModule(wrapper)) {
    throw new Error('The wrapper is not a rule module.');
  }

  return new Linter().verify('const a = 1;', {
    plugins: { test: { rules: { 'some-limit': wrapper } } },
    rules: { 'test/some-limit': setting },
  });
}

const missingRule = optionalPluginRule(
  'absent/',
  'eslint-plugin-absent',
  'some-limit',
  notInstalled,
);

test('a wrapper of a rule whose plugin is not installed loads, and stays silent while it is off', () => {
  assert.deepEqual(lintWith('off', missingRule), []);
});

test('a wrapper of a rule whose plugin is not installed names the rule it wraps when a config turns it on', () => {
  assert.throws(
    () => lintWith(['error', 7], missingRule),
    /wraps absent\/some-limit, which could not be loaded/,
  );
});

const create = (): object => ({});
const notRules: Readonly<Record<string, unknown>> = {
  'an object with neither create nor meta': {},
  'a create that is not a function': { create: 'create', meta: { schema: [] } },
  'a schema that is not an object': { create, meta: { schema: 'none' } },
  'a null schema': { create, meta: { schema: null } },
};

Object.entries(notRules).forEach(([what, module]) => {
  test(`a wrapper of what loaded as ${what} counts its rule as not loaded`, () => {
    const upstream = { id: 'absent/some-limit', module };

    assert.deepEqual(lintWith('off', upstream), []);
    assert.throws(
      () => lintWith(['error', 7], upstream),
      /wraps absent\/some-limit, which could not be loaded/,
    );
  });
});
