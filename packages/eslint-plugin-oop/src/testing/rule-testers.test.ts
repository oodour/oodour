import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRule, type Remedy } from '../create-rule.ts';
import { join } from 'node:path';
import { cureContractProblem, testConfiguredRule, testConfiguredRules, testerConfigFor, testRule } from './rule-testers.ts';

test('testConfiguredRules refuses cases that leave a configured cue out', () => {
  assert.throws(
    () => {
      // @ts-expect-error -- every configured cue needs cases, so an empty record does not type-check
      testConfiguredRules({});
    },
    { message: /^Configured cues without cases: max-lines-per-function, / },
  );
});

// The catalog sets max-params to 4, so four parameters pass where the rule's own default of 3 would report them.
test('testConfiguredRule runs the cases with the catalog options', () => {
  testConfiguredRule('max-params', {
    valid: ['function f(a, b, c, d) {}'],
    invalid: [{ code: 'function f(a, b, c, d, e) {}', errors: [{ messageId: 'exceed' }] }],
  });
});

test('testConfiguredRule gives a rule that needs type information the strict typed fixture', () => {
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
      docs: { description: 'Some rule', concept: 'Some concept', requiresTypeChecking, remedy, tier: 'strict' },
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

test('testRule runs the cases against the rule as node:test subtests', () => {
  const reportsEveryProgram = createRule({
    name: 'reports-every-program',
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Reports every program',
        concept: 'Some concept',
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
        context.report({ node, messageId: 'program' });
      },
    }),
  });

  testRule(reportsEveryProgram, { valid: [], invalid: [{ code: 'const a: number = 1;', errors: [{ messageId: 'program' }] }] });
});

test('testRule refuses cases that break the cure contract', () => {
  assert.throws(
    () => {
      testRule(ruleWith({ kind: 'fix' }), { valid: [], invalid: [{ code: 'a;', errors: [{ messageId: 'problem' }] }] });
    },
    { message: 'some-rule declares remedy "fix", but no invalid case has an output.' },
  );
});

test('a rule with remedy "none" keeps the cure contract with plain invalid cases', () => {
  const problem = cureContractProblem(ruleWith({ kind: 'none', because: 'a person decides' }), {
    valid: [],
    invalid: [{ code: 'a;', errors: [{ messageId: 'problem' }] }],
  });

  assert.equal(problem, undefined);
});
