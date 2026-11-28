import { join } from 'node:path';
import * as nodeTest from 'node:test';
import {
  RuleTester,
  type RuleTesterConfig,
  type RunTests,
} from '@typescript-eslint/rule-tester';
import { RuleTester as ESLintRuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import type { OopRuleModule } from '../create-rule.ts';
import { listExistingRules, type ConfiguredRuleId } from '../existing-rules.ts';
import { installedRule } from './installed-rules.ts';

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
ESLintRuleTester.describe = RuleTester.describe;
ESLintRuleTester.it = RuleTester.it;
ESLintRuleTester.itOnly = RuleTester.itOnly;

const typedFixture = join(
  import.meta.dirname,
  '..',
  '..',
  'tests',
  'typed-fixture',
);
const typedTesterConfig: RuleTesterConfig = {
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: typedFixture },
  },
};

/** RuleTester cases for a configured existing rule. They carry no options: the catalog's are added to each. */
export interface ConfiguredCases {
  readonly valid: readonly (
    | string
    | Omit<ESLintRuleTester.ValidTestCase, 'options'>
  )[];
  readonly invalid: readonly Omit<
    ESLintRuleTester.InvalidTestCase,
    'options'
  >[];
}

/**
 * Runs the cases of every configured existing rule. The record's type comes from the catalog, so a cue with options and
 * no cases does not compile.
 */
export function testConfiguredRules(
  cases: Readonly<Record<ConfiguredRuleId, ConfiguredCases>>,
): void {
  const configured = listExistingRules().filter(
    ({ stance }) => 'cue' in stance && stance.options !== undefined,
  );
  const missing = configured
    .filter(({ id }) => !Object.hasOwn(cases, id))
    .map(({ id }) => id);

  if (missing.length > 0) {
    throw new Error(`Configured cues without cases: ${missing.join(', ')}.`);
  }

  Object.entries<ConfiguredCases>(cases).forEach(([id, ruleCases]) => {
    testConfiguredRule(id, ruleCases);
  });
}

/** Runs cases against one configured existing rule, under ESLint's own RuleTester, with the catalog's options. */
export function testConfiguredRule(id: string, cases: ConfiguredCases): void {
  const row = listExistingRules().find((candidate) => candidate.id === id);
  const rule = row && installedRule(row);
  const options = row && 'cue' in row.stance ? row.stance.options : undefined;

  if (rule === undefined || options === undefined) {
    throw new Error(`${id} is not a configured cue of an installed rule.`);
  }

  // One typed setup for every existing rule: it parses TypeScript, and the rules that need no types ignore the program.
  const tester = new ESLintRuleTester({
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: typedFixture },
    },
  });
  const filename = join(typedFixture, 'file.ts');

  tester.run(id, rule, {
    valid: cases.valid.map((item) => ({
      ...(typeof item === 'string' ? { code: item } : item),
      filename,
      options: [...options],
    })),
    invalid: cases.invalid.map((item) => ({
      ...item,
      filename,
      options: [...options],
    })),
  });
}

/**
 * Why the cases do not exercise the rule's declared remedy, or `undefined` when they do: a `fix` rule needs an invalid
 * case with `output`, a `suggestion` rule an error with `suggestions`.
 */
export function cureContractProblem<
  TMessageIds extends string,
  TOptions extends readonly unknown[],
>(
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
export function testRule<
  TMessageIds extends string,
  TOptions extends readonly unknown[],
>(
  rule: OopRuleModule<TMessageIds, TOptions>,
  cases: RunTests<TMessageIds, TOptions>,
): void {
  runCases(rule, cases, testerConfigFor(rule), rule.name);
}

/**
 * Runs RuleTester cases against one of this plugin's rules with type information, whatever its `requiresTypeChecking`
 * says, for a rule that reports without types and narrows its reports when they are there.
 */
export function testRuleWithTypes<
  TMessageIds extends string,
  TOptions extends readonly unknown[],
>(
  rule: OopRuleModule<TMessageIds, TOptions>,
  cases: RunTests<TMessageIds, TOptions>,
): void {
  runCases(
    rule,
    cases,
    typedTesterConfig,
    `${rule.name} with type information`,
  );
}

function runCases<
  TMessageIds extends string,
  TOptions extends readonly unknown[],
>(
  rule: OopRuleModule<TMessageIds, TOptions>,
  cases: RunTests<TMessageIds, TOptions>,
  config: RuleTesterConfig,
  suite: string,
): void {
  const problem = cureContractProblem(rule, cases);

  if (problem !== undefined) {
    throw new Error(problem);
  }

  new RuleTester(config).run(suite, rule, cases);
}

/** The tester configuration a rule's own `requiresTypeChecking` asks for. */
export function testerConfigFor(rule: OopRuleModule): RuleTesterConfig {
  return rule.meta.docs.requiresTypeChecking ? typedTesterConfig : {};
}

function showsOutput({
  invalid,
}: RunTests<string, readonly unknown[]>): boolean {
  return invalid.some(({ output }) => output !== undefined && output !== null);
}

function showsSuggestions({
  invalid,
}: RunTests<string, readonly unknown[]>): boolean {
  return invalid.some(({ errors }) =>
    errors.some(
      ({ suggestions }) =>
        suggestions !== undefined &&
        suggestions !== null &&
        suggestions.length > 0,
    ),
  );
}
