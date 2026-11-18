import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { CodemodName } from '../codemods/codemod-registry.ts';

/**
 * How a finding gets cured, highest available first (Lars, 2026-11-18: "a code fixer if possible. Alternatively,
 * a custom codemod ... referenced in its error message").
 * - fix: the rule's fixer makes a safe, local change.
 * - suggestion: an editor suggestion a person confirms.
 * - codemod: a whole-program change the message names; `codemod` must be a registered name (checked by the compiler).
 * - none: no mechanical cure; `why` is appended to every message and shown in the rule's docs.
 * Rules declare the highest kind they offer; a fix rule may still set `hasSuggestions` for other cases.
 */
export type Cure =
  | { readonly kind: 'fix' }
  | { readonly kind: 'suggestion' }
  | { readonly kind: 'codemod'; readonly codemod: CodemodName }
  | { readonly kind: 'none'; readonly why: string };

/** Plugin-specific `meta.docs` fields; documentation only, like typescript-eslint's `ESLintPluginDocs`. */
export interface OopDocs {
  /** The lz-oop concept the rule points at, by its public name (a smell, refactoring or principle). */
  readonly concept: string;
  readonly cure: Cure;
  /** Decides the preset: true -> recommended-type-checked only, false -> both presets. Nothing else to edit. */
  readonly requiresTypeChecking: boolean;
}

export interface OopRuleInput<TOptions extends readonly unknown[], TMessageIds extends string> {
  readonly name: string;
  readonly concept: string;
  readonly cure: Cure;
  readonly requiresTypeChecking: boolean;
  readonly meta: {
    readonly type: 'problem' | 'suggestion';
    readonly docs: { readonly description: string };
    /** Claude's own words. The factory appends the codemod line or the `why`; do not write them here. */
    readonly messages: Readonly<Record<TMessageIds, string>>;
    readonly schema: TSESLint.JSONSchema.JSONSchema4 | readonly TSESLint.JSONSchema.JSONSchema4[];
    readonly defaultOptions: TOptions;
    /** Only for a `fix` rule that also suggests in some cases; `fixable` itself is derived from `cure`. */
    readonly hasSuggestions?: true;
  };
  readonly create: (
    context: Readonly<TSESLint.RuleContext<TMessageIds, TOptions>>,
    options: TOptions,
  ) => TSESLint.RuleListener;
}

/** The module every own rule is; `name` is kept so the registry and presets can key on it. */
export type OopRule<TOptions extends readonly unknown[] = readonly unknown[], TMessageIds extends string = string> =
  TSESLint.RuleModule<TMessageIds, TOptions, OopDocs> & { readonly name: string };

/** One docs URL per rule. Placeholder base until Lars rules on where the docs are published. */
const createRule = ESLintUtils.RuleCreator<OopDocs>((name) => `https://example.invalid/eslint-plugin-oop/rules/${name}.md`);

/**
 * The shared rule factory. Derives from `cure`:
 * - `meta.fixable = 'code'` when kind is fix; `meta.hasSuggestions = true` when kind is suggestion;
 * - each message + `codemodHint(cure.codemod)` when kind is codemod, so every report names the command;
 * - each message + ` (${cure.why})` when kind is none.
 * Moves concept, cure and requiresTypeChecking into `meta.docs`.
 * Invariant: no own rule is built without this function (own-rules.ts types its array as `OopRule[]`, which only
 * this factory and defineSelectorRule produce in practice; presets.test.ts asserts every rule has `docs.cure`).
 */
export function defineOopRule<TOptions extends readonly unknown[], TMessageIds extends string>(
  input: OopRuleInput<TOptions, TMessageIds>,
): OopRule<TOptions, TMessageIds> {
  // TODO: createRule({ name, meta: { ...meta, docs: {...}, fixable, hasSuggestions, messages: suffixed }, create })
  void createRule;
  void input;
  throw new Error('not implemented');
}

/**
 * The one place the codemod command text lives. Placeholders are filled by `codemodTarget`; a report that forgets
 * them leaves `{{codemodFile}}` unsubstituted, which the rule tester rejects.
 */
export function codemodHint(codemod: CodemodName): string {
  // TODO: `Codemod: npx oop-codemod ${codemod} --file {{codemodFile}} --line {{codemodLine}}`
  void codemod;
  throw new Error('not implemented');
}

/** Data a codemod-cured rule spreads into every report: the file relative to cwd and the node's start line. */
export function codemodTarget(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
  node: TSESTree.Node,
): { readonly codemodFile: string; readonly codemodLine: string } {
  // TODO: path.relative(context.cwd, context.filename) with forward slashes; String(node.loc.start.line)
  void context;
  void node;
  throw new Error('not implemented');
}
