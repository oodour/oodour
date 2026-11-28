import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, test } from 'node:test';
import { createRule, type Remedy } from '../create-rule.ts';
import { join } from 'node:path';
import { cureContractProblem, testConfiguredRule, testConfiguredRules, testerConfigFor, testRule, testRuleWithTypes } from './rule-testers.ts';

const noCases = { valid: [], invalid: [] };

test('testConfiguredRules refuses cases that leave a configured cue out', () => {
  assert.throws(
    () => {
      // @ts-expect-error -- every configured cue needs cases, so an empty record does not type-check
      testConfiguredRules({});
    },
    { message: /^Configured cues without cases: no-param-reassign, / },
  );
});

test('testConfiguredRules refuses cases that leave a single configured cue out, and names it', () => {
  assert.throws(
    () => {
      // @ts-expect-error -- every configured cue needs cases, so a record without one of them does not type-check
      testConfiguredRules({
        'no-param-reassign': noCases,
        '@typescript-eslint/switch-exhaustiveness-check': noCases,
        '@typescript-eslint/method-signature-style': noCases,
        '@eslint-community/eslint-comments/require-description': noCases,
      });
    },
    { message: 'Configured cues without cases: functional/immutable-data.' },
  );
});

test('testConfiguredRule refuses a rule the catalog sets no options for, and names it', () => {
  assert.throws(
    () => {
      testConfiguredRule('no-else-return', noCases);
    },
    { message: 'no-else-return is not a configured cue of an installed rule.' },
  );
});

// The testers below register suites of their own, so each runs in a suite: a test on Node.js 22 ends before the suites
// registered inside it, and cancels them.
describe('testConfiguredRules runs the cases of every configured cue', () => {
  const ran: string[] = [];
  const recording = (id: string) => ({
    valid: [
      {
        code: 'const a = 1;',
        after: () => {
          ran.push(id);
        },
      },
    ],
    invalid: [],
  });

  testConfiguredRules({
    'no-param-reassign': recording('no-param-reassign'),
    '@typescript-eslint/switch-exhaustiveness-check': recording('@typescript-eslint/switch-exhaustiveness-check'),
    '@typescript-eslint/method-signature-style': recording('@typescript-eslint/method-signature-style'),
    '@eslint-community/eslint-comments/require-description': recording('@eslint-community/eslint-comments/require-description'),
    'functional/immutable-data': recording('functional/immutable-data'),
  });

  test('each case ran by the time the suites registered before this test ended', () => {
    assert.deepEqual(ran, [
      'no-param-reassign',
      '@typescript-eslint/switch-exhaustiveness-check',
      '@typescript-eslint/method-signature-style',
      '@eslint-community/eslint-comments/require-description',
      'functional/immutable-data',
    ]);
  });
});

// The catalog sets `props: true`, so a write to a parameter's property is reported where the rule's default passes it.
describe('testConfiguredRule runs the cases with the catalog options', () => {
  testConfiguredRule('no-param-reassign', {
    valid: ['function f(order) { return { ...order, total: 0 }; }'],
    invalid: [{ code: 'function f(order) { order.total = 0; }', errors: [{ messageId: 'assignmentToFunctionParamProp' }] }],
  });
});

describe('testConfiguredRule gives a rule that needs type information the strict typed fixture', () => {
  const shape = "type Shape = 'circle' | 'square';\ndeclare const shape: Shape;\n";

  testConfiguredRule('@typescript-eslint/switch-exhaustiveness-check', {
    valid: [`${shape}switch (shape) {\n  case 'circle':\n  case 'square':\n    break;\n}\n`],
    invalid: [
      {
        code: `${shape}switch (shape) {\n  case 'circle':\n    break;\n  default:\n    break;\n}\n`,
        errors: [
          {
            messageId: 'switchIsNotExhaustive',
            suggestions: [
              {
                messageId: 'addMissingCases',
                output: `${shape}switch (shape) {\n  case 'circle':\n    break;\n  case "square": { throw new Error('Not implemented yet: "square" case') }\n  default:\n    break;\n}\n`,
              },
            ],
          },
        ],
      },
    ],
  });
});

function ruleWith(remedy: Remedy, requiresTypeChecking = false) {
  return createRule({
    name: 'some-rule',
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Some rule',
        concept: 'Some concept',
        cures: ['Some cure'],
        requiresTypeChecking,
        remedy,
        tier: 'strict',
      },
      messages: { problem: 'A problem.' },
      schema: [],
      defaultOptions: [],
    },
    create: () => ({}),
  });
}

test('a fix rule whose invalid cases show no output breaks the cure contract', () => {
  const problem = cureContractProblem(ruleWith({ kind: 'fix' }), {
    valid: [],
    invalid: [{ code: 'a;', errors: [{ messageId: 'problem' }] }],
  });

  assert.equal(problem, 'some-rule declares remedy "fix", but no invalid case has an output.');
});

test('a fix rule with an invalid case that shows its output keeps the cure contract', () => {
  const problem = cureContractProblem(ruleWith({ kind: 'fix' }), {
    valid: [],
    invalid: [
      { code: 'a;', errors: [{ messageId: 'problem' }] },
      { code: 'b;', output: 'c;', errors: [{ messageId: 'problem' }] },
    ],
  });

  assert.equal(problem, undefined);
});

test('a fix rule whose only output is null, which says the fix changes nothing, breaks the cure contract', () => {
  const problem = cureContractProblem(ruleWith({ kind: 'fix' }), {
    valid: [],
    invalid: [{ code: 'a;', output: null, errors: [{ messageId: 'problem' }] }],
  });

  assert.equal(problem, 'some-rule declares remedy "fix", but no invalid case has an output.');
});

test('a suggestion rule whose errors list no suggestion breaks the cure contract', () => {
  const problem = cureContractProblem(ruleWith({ kind: 'suggestion', because: 'a person confirms it' }), {
    valid: [],
    invalid: [{ code: 'a;', errors: [{ messageId: 'problem', suggestions: [] }] }],
  });

  assert.equal(problem, 'some-rule declares remedy "suggestion", but no error of an invalid case has suggestions.');
});

test('a suggestion rule whose errors show no suggestions breaks the cure contract', () => {
  const problem = cureContractProblem(ruleWith({ kind: 'suggestion', because: 'a person confirms it' }), {
    valid: [],
    invalid: [{ code: 'a;', output: 'b;', errors: [{ messageId: 'problem' }] }],
  });

  assert.equal(problem, 'some-rule declares remedy "suggestion", but no error of an invalid case has suggestions.');
});

test('a suggestion rule with an error that shows its suggestions keeps the cure contract', () => {
  const problem = cureContractProblem(ruleWith({ kind: 'suggestion', because: 'a person confirms it' }), {
    valid: [],
    invalid: [
      { code: 'a;', errors: [{ messageId: 'problem' }] },
      {
        code: 'b;',
        errors: [{ messageId: 'problem' }, { messageId: 'problem', suggestions: [{ messageId: 'problem', output: 'c;' }] }],
      },
    ],
  });

  assert.equal(problem, undefined);
});

test('a rule that requires type checking is tested with the project service on the strict typed fixture', () => {
  const config = testerConfigFor(ruleWith({ kind: 'fix' }, true));

  assert.deepEqual(config, {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: join(import.meta.dirname, '..', '..', 'tests', 'typed-fixture'),
      },
    },
  });
});

test('a rule that needs no type checking is tested without type information', () => {
  assert.deepEqual(testerConfigFor(ruleWith({ kind: 'fix' }, false)), {});
});

describe('testRule runs the cases against the rule as node:test subtests', () => {
  const linted: string[] = [];
  const reportsEveryProgram = createRule({
    name: 'reports-every-program',
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Reports every program',
        concept: 'Some concept',
        cures: ['Some cure'],
        requiresTypeChecking: false,
        remedy: { kind: 'none', because: 'a person decides' },
        tier: 'strict',
      },
      messages: { program: 'A program.' },
      schema: [],
      defaultOptions: [],
    },
    create: (context) => ({
      Program(node) {
        linted.push(context.sourceCode.text);
        context.report({ node, messageId: 'program' });
      },
    }),
  });

  // Without --test-only, node:test runs a case marked `only` beside the others.
  testRule(reportsEveryProgram, {
    valid: [],
    invalid: [
      { code: 'const a: number = 1;', errors: [{ messageId: 'program' }] },
      { code: 'const b: number = 2;', only: true, errors: [{ messageId: 'program' }] },
    ],
  });

  test('the rule linted each case by the time the suites registered before this test ended', () => {
    assert.deepEqual(linted, ['const a: number = 1;', 'const b: number = 2;']);
  });
});

test('testRule refuses cases that break the cure contract', () => {
  assert.throws(
    () => {
      testRule(ruleWith({ kind: 'fix' }), { valid: [], invalid: [{ code: 'a;', errors: [{ messageId: 'problem' }] }] });
    },
    { message: 'some-rule declares remedy "fix", but no invalid case has an output.' },
  );
});

test('testRuleWithTypes refuses cases that break the cure contract', () => {
  assert.throws(
    () => {
      testRuleWithTypes(ruleWith({ kind: 'fix' }), { valid: [], invalid: [{ code: 'a;', errors: [{ messageId: 'problem' }] }] });
    },
    { message: 'some-rule declares remedy "fix", but no invalid case has an output.' },
  );
});

describe('testRuleWithTypes gives type information to a rule that does not require it', () => {
  const readsTypes = createRule({
    name: 'reads-types',
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Reports every program whose file came with a type checker',
        concept: 'Some concept',
        cures: ['Some cure'],
        requiresTypeChecking: false,
        remedy: { kind: 'none', because: 'a person decides' },
        tier: 'strict',
      },
      messages: { typed: 'A typed program.' },
      schema: [],
      defaultOptions: [],
    },
    create: (context) => ({
      Program(node) {
        if (context.sourceCode.parserServices?.program) {
          context.report({ node, messageId: 'typed' });
        }
      },
    }),
  });

  testRuleWithTypes(readsTypes, { valid: [], invalid: [{ code: 'const a = 1;', errors: [{ messageId: 'typed' }] }] });

  test('a spec file that calls it reports a suite named after the rule, with type information', () => {
    const spec = join(import.meta.dirname, '..', '..', 'tests', 'typed-suite', 'spec.ts');
    // Without the variables that make this process a test file of an outer run, the spec reports as a run of its own.
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([name]) => name !== 'NODE_TEST_CONTEXT' && name !== 'NODE_OPTIONS'),
    );
    const { status, stdout, stderr } = spawnSync(
      process.execPath,
      ['--conditions=@oodour/source', '--test-reporter=tap', spec],
      { encoding: 'utf8', env, timeout: 120_000 },
    );

    assert.equal(status, 0, stderr);
    assert.match(stdout, /^# Subtest: feature-envy with type information$/m);
    assert.match(stdout, /^# pass 1$/m);
  });
});

test('a rule with remedy "none" keeps the cure contract with plain invalid cases', () => {
  const problem = cureContractProblem(ruleWith({ kind: 'none', because: 'a person decides' }), {
    valid: [],
    invalid: [{ code: 'a;', errors: [{ messageId: 'problem' }] }],
  });

  assert.equal(problem, undefined);
});
