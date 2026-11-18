import type { OopRuleModule } from './create-rule.ts';

/** The prefix of this plugin's rule IDs: `@layzee/oop/type-hopping-chain`. */
export const pluginNamespace = '@layzee/oop';

/**
 * A flat config object, typed wider than ESLint's own `Linter.Config` on purpose: a rule built with typescript-eslint's
 * types does not type-check as an ESLint rule, so a plugin object holding one cannot be typed as `ESLint.Plugin`. This
 * shape is assignable to `Linter.Config` and accepted by `defineConfig`, the route typescript-eslint itself takes.
 * The arrays stay mutable because `defineConfig` does not accept readonly ones.
 */
export interface OopConfig {
  readonly name: string;
  readonly plugins?: Readonly<Record<string, { readonly meta: { readonly name: string } }>>;
  readonly rules?: Readonly<Record<string, 'error' | 'off'>>;
}

// A type literal, not an interface: ESLint's `Plugin.configs` is a string-keyed record, and only a type literal is
// assignable to one without an index signature of its own.
export type OopConfigs = {
  readonly recommended: OopConfig[];
  readonly 'recommended-type-checked': OopConfig[];
  readonly strict: OopConfig[];
  readonly 'strict-type-checked': OopConfig[];
  readonly recommendedTypeChecked: OopConfig[];
  readonly strictTypeChecked: OopConfig[];
};

/** What a preset registers under `pluginNamespace`: the plugin object itself. */
export interface RegisteredPlugin {
  readonly meta: { readonly name: string; readonly version: string; readonly namespace: string };
  readonly rules: Readonly<Record<string, OopRuleModule>>;
}

/** Derives every preset from the rule registry; there is no list of rule names here. */
export function buildConfigs(plugin: RegisteredPlugin): OopConfigs {
  const plugins: OopConfig = { name: 'oop/plugins', plugins: { [pluginNamespace]: plugin } };
  const layer = (name: string, keep: (rule: OopRuleModule) => boolean): OopConfig => ({
    name,
    rules: Object.fromEntries(
      Object.entries(plugin.rules)
        .filter(([, rule]) => keep(rule))
        .map(([ruleName]) => [`${pluginNamespace}/${ruleName}`, 'error']),
    ),
  });
  const untyped = (rule: OopRuleModule): boolean => !rule.meta.docs.requiresTypeChecking;
  const recommendedTier = (rule: OopRuleModule): boolean => rule.meta.docs.tier === 'recommended';

  const recommendedTypeChecked = [plugins, layer('oop/recommended-type-checked', recommendedTier)];
  const strictTypeChecked = [plugins, layer('oop/strict-type-checked', () => true)];

  return {
    recommended: [plugins, layer('oop/recommended', (rule) => recommendedTier(rule) && untyped(rule))],
    'recommended-type-checked': recommendedTypeChecked,
    strict: [plugins, layer('oop/strict', untyped)],
    'strict-type-checked': strictTypeChecked,
    recommendedTypeChecked,
    strictTypeChecked,
  };
}
