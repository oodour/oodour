import { join } from 'node:path';
import * as nodeTest from 'node:test';
import { RuleTester, type RuleTesterConfig, type RunTests } from '@typescript-eslint/rule-tester';
import type { OopRuleModule } from '../create-rule.ts';

// Importing this module is what connects RuleTester to node:test, so a single spec runs with no preload flag.
RuleTester.afterAll = nodeTest.after;
// node:test returns a promise from each of these, and its runner tracks the tests without anyone awaiting it.
RuleTester.describe = (text, fn) => {
  void nodeTest.describe(text, fn);
};
RuleTester.it = (text, fn) => {
  void nodeTest.it(text, fn);
};
RuleTester.itOnly = (text, fn) => {
  void nodeTest.it.only(text, fn);
};

/**
 * Why the cases do not exercise the rule's declared remedy, or `undefined` when they do: a `fix` rule needs an invalid
 * case with `output`, a `suggestion` rule an error with `suggestions`.
 */
export function cureContractProblem<TMessageIds extends string, TOptions extends readonly unknown[]>(
  rule: OopRuleModule<TMessageIds, TOptions>,
  cases: RunTests<TMessageIds, TOptions>,
): string | undefined {
  const { kind } = rule.meta.docs.remedy;

  if (kind === 'fix' && !showsOutput(cases)) {
    return `${rule.name} declares remedy "fix", but no invalid case has an output.`;
  }

  if (kind === 'suggestion' && !showsSuggestions(cases)) {
    return `${rule.name} declares remedy "suggestion", but no error of an invalid case has suggestions.`;
  }

  return undefined;
}

/**
 * Runs RuleTester cases against one of this plugin's rules, as node:test tests, under the tester its
 * `requiresTypeChecking` asks for.
 */
export function testRule<TMessageIds extends string, TOptions extends readonly unknown[]>(
  rule: OopRuleModule<TMessageIds, TOptions>,
  cases: RunTests<TMessageIds, TOptions>,
): void {
  const problem = cureContractProblem(rule, cases);

  if (problem !== undefined) {
    throw new Error(problem);
  }

  new RuleTester(testerConfigFor(rule)).run(rule.name, rule, cases);
}

/** The tester configuration a rule's own `requiresTypeChecking` asks for. */
export function testerConfigFor(rule: OopRuleModule): RuleTesterConfig {
  if (!rule.meta.docs.requiresTypeChecking) {
    return {};
  }

  return {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: join(import.meta.dirname, '..', '..', 'tests', 'typed-fixture'),
      },
    },
  };
}

function showsOutput({ invalid }: RunTests<string, readonly unknown[]>): boolean {
  return invalid.some(({ output }) => output !== undefined && output !== null);
}

function showsSuggestions({ invalid }: RunTests<string, readonly unknown[]>): boolean {
  return invalid.some(({ errors }) =>
    errors.some(({ suggestions }) => suggestions !== undefined && suggestions !== null && suggestions.length > 0),
  );
}
