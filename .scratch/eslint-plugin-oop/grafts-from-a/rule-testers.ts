import type { InvalidTestCase, ValidTestCase } from '@typescript-eslint/rule-tester';
import type { ConfiguredRuleId } from '../rule-catalog.ts';
import type { OopRule } from '../rules/define-oop-rule.ts';

/**
 * The two testers (built lazily, after the preload has set the node:test hooks):
 * - typed: typescript-eslint RuleTester, parserOptions { projectService: true, tsconfigRootDir: fixtures/ }.
 *   fixtures/tsconfig.json includes file.ts and react.tsx (typescript-eslint's own layout), so there is no
 *   default-project cap and the compiler options (strict, noUncheckedIndexedAccess) are the workspace's.
 * - untyped: typescript-eslint RuleTester with no parserOptions.project/projectService.
 * Own rules pick by docs.requiresTypeChecking. Borrowed rules pick in runConfiguredRuleTests.
 */
export const fixturesDir = new URL('./fixtures/', import.meta.url);

export interface OopRuleCases<TOptions extends readonly unknown[], TMessageIds extends string> {
  readonly valid: readonly (ValidTestCase<TOptions> | string)[];
  readonly invalid: readonly InvalidTestCase<TMessageIds, TOptions>[];
  /** Codemod output for this rule's invalid code; each runs as a valid case. Required when the cure is a codemod. */
  readonly curedBy?: readonly ValidTestCase<TOptions>[];
}

/**
 * Runs RuleTester for an own rule after checking the cure contract, so a declared cure is always exercised:
 * - fix: at least one invalid case has `output` different from `code`;
 * - suggestion: at least one invalid case has an error with `suggestions`;
 * - codemod: `curedBy` is non-empty (its cases join `valid`);
 * - none: nothing extra (the factory already appended `why` to the message).
 * A contract failure is a failing test named "<rule> cure contract", not a thrown import error.
 */
export function runOopRuleTests<TOptions extends readonly unknown[], TMessageIds extends string>(
  rule: OopRule<TOptions, TMessageIds>,
  cases: OopRuleCases<TOptions, TMessageIds>,
): void {
  // TODO: test.it(`${rule.name} cure contract`, ...) then tester(rule).run(rule.name, rule, { valid: [...valid, ...curedBy], invalid })
  void cases;
  void rule;
  throw new Error('not implemented');
}

/** Cases for a borrowed rule. No `options` field: the options come from the catalog row, never retyped here. */
export interface ConfiguredCases {
  readonly valid: readonly { readonly code: string; readonly filename?: string }[];
  readonly invalid: readonly { readonly code: string; readonly filename?: string; readonly errors: number; readonly output?: string }[];
}

/**
 * Pins a preset's configuration of a borrowed rule: runs the installed rule module (installed-rules.ts) with the
 * catalog row's options injected into every case. `@typescript-eslint/*` rows run on typescript-eslint's tester
 * (typed rows on the typed one); core and third-party rows on ESLint's RuleTester with typescript-eslint's parser,
 * because their modules are ESLint `Rule.RuleModule`s, which typescript-eslint's tester does not accept without a cast.
 * Errors are counted, not matched by messageId: the message is the borrowed rule's, and its wording may change.
 * Iterates catalogEntries() (string IDs at run time) and reads `cases` by `Object.hasOwn`, so the typed record is
 * never walked with Object.entries and no key cast is needed.
 */
export async function runConfiguredRuleTests(cases: Readonly<Record<ConfiguredRuleId, ConfiguredCases>>): Promise<void> {
  // TODO: for each configured entry: module = await installedRuleModule(ns, name); tester by namespace and typed
  void cases;
  throw new Error('not implemented');
}
