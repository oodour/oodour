import type { Linter } from 'eslint';
import type { OopRuleModule } from './create-rule.ts';
import type { OptionalSourceId } from './existing-rules.ts';

/** The prefix of this plugin's rule IDs: `@layzee/oop/middle-man`. Written once, here. */
export const pluginNamespace = '@layzee/oop';

/**
 * The public configs. Every value is an array of named flat config objects with no `files`, no parser and no
 * `parserOptions`: the consumer scopes them with `files` and sets up typed linting the usual way.
 */
export type OopConfigs = {
  /**
   * Usable without type information: the cues from ESLint core and typescript-eslint that need no types, this
   * plugin's rules that need no types, and every conflict turned off.
   */
  readonly recommended: Linter.Config[];
  /** `recommended` plus the cues and own rules that need type information. */
  readonly 'recommended-type-checked': Linter.Config[];
  /**
   * Only the conflicts, turned off, for every source in the catalog. For a consumer who wants their existing lint
   * setup to stop working against lz-oop without taking the cues. Already part of both `recommended` configs.
   */
  readonly conflicts: Linter.Config[];
} & {
  /**
   * One companion config per optional source: that plugin's cues at `warn`. It does not register the plugin; a
   * consumer adds it after registering the plugin themselves. ESLint names the missing plugin if they did not.
   */
  readonly [S in OptionalSourceId]: Linter.Config[];
};

/** What a preset registers under `pluginNamespace`: the plugin object itself, before `configs` is filled. */
export interface RegisteredPlugin {
  readonly meta: { readonly name: string; readonly version: string; readonly namespace: string };
  readonly rules: Readonly<Record<string, OopRuleModule>>;
}

/**
 * Derives every config from the rule registry (`plugin.rules`) and the catalog (`existing-rules.ts`). There is no
 * list of rule names in this module, so a preset cannot fall out of step with either.
 *
 * Named layers, so the config inspector shows where an entry came from:
 * - `oop/plugins`: registers `plugin` under `pluginNamespace` and the installed `@typescript-eslint` plugin.
 * - `oop/recommended`: cues and own rules that need no types.
 * - `oop/recommended-type-checked`: cues and own rules that need types.
 * - `oop/conflicts`: every conflict of every source, `off`.
 * - `oop/<optional source>`: that source's cues.
 */
export function buildConfigs(plugin: RegisteredPlugin): OopConfigs {
  // TODO
  // const cueSeverity = 'warn';                      the only place a severity is chosen
  // entry(cue)       = cue.options ? [cueSeverity, ...cue.options] : cueSeverity
  // needsTypes(rule) = own rule:          rule.meta.docs.requiresTypeChecking
  //                    typescript-eslint: installed rule's meta.docs.requiresTypeChecking === true
  //                    ESLint core:       false
  //
  // plugins     = { name: 'oop/plugins', plugins: { [pluginNamespace]: plugin, '@typescript-eslint': installed } }
  // untyped     = { name: 'oop/recommended', rules: cues(not optional, !needsTypes) + ownRules(!needsTypes) }
  // typed       = { name: 'oop/recommended-type-checked', rules: cues(not optional, needsTypes) + ownRules(needsTypes) }
  // conflicts   = { name: 'oop/conflicts', rules: every Conflict of every source -> 'off' }
  //
  // recommended                 = [plugins, untyped, conflicts]
  // 'recommended-type-checked'  = [plugins, untyped, typed, conflicts]
  // conflicts                   = [conflicts]
  // [optional source id]        = [{ name: `oop/${id}`, rules: that source's cues }]
  throw new Error(`not implemented: ${plugin.meta.name}`);
}
