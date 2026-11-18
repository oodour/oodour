/**
 * The test harness. A test file gets a tester only by importing this module, and importing it is what connects
 * both RuleTester classes to `node:test`. So `node --test one-file.test.ts` works with no `--import` flag, and the
 * "Missing definition for `afterAll`" failure cannot happen.
 *
 * Never imported by `index.ts` or anything it loads.
 */
import type { RuleTester as EslintRuleTester } from 'eslint';
import type { RunTests } from '@typescript-eslint/rule-tester';
import type { OopRuleModule } from '../create-rule.ts';
import type { ConfiguredRuleId } from '../existing-rules.ts';

// TODO, at module level, before any tester exists:
//   import * as nodeTest from 'node:test';
//   TypescriptRuleTester.afterAll = nodeTest.after;  .describe = nodeTest.describe;  .it = nodeTest.it;
//   TypescriptRuleTester.itOnly = nodeTest.it.only;
//   EslintRuleTester.describe = nodeTest.describe;   .it = nodeTest.it;   .itOnly = nodeTest.it.only;
//
//   const typedFixture = <package root>/tests/typed-fixture   (tsconfig.json with strict options, and file.ts)
//   untyped tester: new TypescriptRuleTester()
//   typed tester:   new TypescriptRuleTester({ languageOptions: { parserOptions: {
//                     projectService: true, tsconfigRootDir: typedFixture } } })

/**
 * Runs RuleTester cases against one of this plugin's rules, under typescript-eslint's RuleTester.
 *
 * The tester follows the rule's own declaration: `docs.requiresTypeChecking: false` gets the tester without type
 * information. A rule that claims to need no types but asks for parser services therefore fails here, before it
 * can crash the `recommended` preset in a consumer's untyped setup. The suite is named after `rule.name`.
 */
export function testRule<MessageIds extends string, Options extends readonly unknown[]>(
  rule: OopRuleModule<MessageIds, Options>,
  cases: RunTests<MessageIds, Options>,
): void {
  throw new Error(`not implemented: ${rule.name} ${String(cases.valid.length)}`);
}

/** RuleTester cases for an existing rule. No `options`: the catalog supplies them. */
export interface ConfiguredRuleCases {
  readonly valid: readonly Omit<EslintRuleTester.ValidTestCase, 'options'>[];
  readonly invalid: readonly Omit<EslintRuleTester.InvalidTestCase, 'options'>[];
}

/**
 * Pins the configuration of every existing rule the catalog sets with options: runs each installed rule under
 * ESLint's own RuleTester with the catalog's options. Change the options in `existing-rules.ts` and these cases
 * decide whether the new configuration still reports what the cue is for.
 *
 * The parameter type lists every configured rule, so a missing pin is a type error.
 *
 * It works for any configured rule, a `no-restricted-syntax` selector list included: that is one more rule with
 * options. When the installed rule fixes or suggests, RuleTester requires `output` or `suggestions` in the cases,
 * so an upstream fixer is pinned along with the options.
 */
export function testConfiguredRules(cases: Readonly<Record<ConfiguredRuleId, ConfiguredRuleCases>>): void {
  // TODO, for each id:
  // const installed = installedRule(id);                    throws when the installed package lacks the rule
  // const options   = the catalog's options for id
  // tester          = ESLint's RuleTester with the typescript-eslint parser; when installed.requiresTypeChecking,
  //                   add projectService + tsconfigRootDir and `filename: <typedFixture>/file.ts` to every case
  // tester.run(id, installed.module, the cases with `options` added to each)
  throw new Error(`not implemented: ${String(Object.keys(cases).length)}`);
}
