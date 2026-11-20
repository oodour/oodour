import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import type { Companion, OopRuleModule, Tier } from './create-rule.ts';
import { listExistingRules, type CatalogRow } from './existing-rules.ts';

/** The prefix of this plugin's rule IDs: `@layzee/lz-oop/type-hopping-chain`. */
export const pluginNamespace = '@layzee/lz-oop';

/**
 * A flat config object, typed wider than ESLint's own `Linter.Config` on purpose: a rule built with typescript-eslint's
 * types does not type-check as an ESLint rule, so a plugin object holding one cannot be typed as `ESLint.Plugin`. This
 * shape is assignable to `Linter.Config` and accepted by `defineConfig`, the route typescript-eslint itself takes.
 * A plugin is any object, since eslint-plugin-eslint-comments has no `meta`.
 * The arrays stay mutable because `defineConfig` does not accept readonly ones.
 */
export interface OopConfig {
  readonly name: string;
  readonly plugins?: Readonly<Record<string, object>>;
  readonly ignores?: string[];
  readonly rules?: Readonly<Record<string, 'error' | 'off' | ['error', ...unknown[]]>>;
}

/** Where a rule with `skipsTestFiles` stays off: test files by the common naming conventions, and declaration files. */
export const testFileGlobs = ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/*.d.ts'];

// A type literal, not an interface: ESLint's `Plugin.configs` is a string-keyed record, and only a type literal is
// assignable to one without an index signature of its own.
export type OopConfigs = {
  readonly recommended: OopConfig[];
  readonly 'recommended-type-checked': OopConfig[];
  readonly strict: OopConfig[];
  readonly 'strict-type-checked': OopConfig[];
  readonly recommendedTypeChecked: OopConfig[];
  readonly strictTypeChecked: OopConfig[];
  /** Only the conflicts turned off, for a consumer who wants their own setup to stop working against lz-oop. */
  readonly conflicts: OopConfig[];
  /** The unicorn cues, for a consumer who registers eslint-plugin-unicorn under `unicorn`. */
  readonly unicorn: OopConfig[];
  /** The sonarjs cues, for a consumer who registers eslint-plugin-sonarjs under `sonarjs`. */
  readonly sonarjs: OopConfig[];
  /** The functional cues, for a consumer who registers eslint-plugin-functional under `functional`. Needs type information. */
  readonly functional: OopConfig[];
};

/** What a preset registers under `pluginNamespace`: the plugin object itself. */
export interface RegisteredPlugin {
  readonly meta: { readonly name: string; readonly version: string; readonly namespace: string };
  readonly rules: Readonly<Record<string, OopRuleModule>>;
}

/** Derives every preset from the rule registry; there is no list of rule names here. */
export function buildConfigs(plugin: RegisteredPlugin): OopConfigs {
  const plugins: OopConfig = {
    name: 'lz-oop/plugins',
    plugins: {
      [pluginNamespace]: plugin,
      '@typescript-eslint': tseslintPlugin,
      '@eslint-community/eslint-comments': eslintCommentsPlugin,
    },
  };
  const allEntries = [...ownRuleEntries(plugin), ...cueEntries()];
  // A rule that needs an optional plugin goes in that plugin's companion config, since turning on a rule of an
  // unregistered plugin throws, and a wrapper of a missing rule throws too.
  const entries = allEntries.filter((entry) => entry.companion === undefined);
  const companion = (source: Companion): OopConfig[] => [
    {
      name: `lz-oop/${source}`,
      plugins: { [pluginNamespace]: plugin },
      rules: rulesOf(
        allEntries.filter((entry) => entry.companion === source),
        // Stryker disable next-line BooleanLiteral: no rule in a companion config sets strict options
        false,
      ),
    },
  ];
  const layers = (name: string, keep: (entry: PresetEntry) => boolean, strict: boolean): OopConfig[] => [
    { name, rules: rulesOf(entries.filter((entry) => keep(entry) && !entry.skipsTestFiles), strict) },
    {
      name: `${name}/outside-test-files`,
      ignores: testFileGlobs,
      rules: rulesOf(
        entries.filter((entry) => keep(entry) && entry.skipsTestFiles),
        strict,
      ),
    },
  ];
  const untyped = (entry: PresetEntry): boolean => !entry.typed;
  const recommendedTier = (entry: PresetEntry): boolean => entry.tier === 'recommended';
  const conflicts = turnedOff('lz-oop/conflicts', 'conflict');
  const duplicates = turnedOff('lz-oop/duplicates', 'duplicateOf');
  const preset = (name: string, keep: (entry: PresetEntry) => boolean, strict = false): OopConfig[] => [
    plugins,
    ...layers(name, keep, strict),
    duplicates,
    conflicts,
  ];
  const recommendedTypeChecked = preset('lz-oop/recommended-type-checked', recommendedTier);
  const strictTypeChecked = preset('lz-oop/strict-type-checked', () => true, true);

  return {
    recommended: preset('lz-oop/recommended', (entry) => recommendedTier(entry) && untyped(entry)),
    'recommended-type-checked': recommendedTypeChecked,
    strict: preset('lz-oop/strict', untyped, true),
    'strict-type-checked': strictTypeChecked,
    recommendedTypeChecked,
    strictTypeChecked,
    conflicts: [conflicts],
    unicorn: companion('unicorn'),
    sonarjs: companion('sonarjs'),
    functional: companion('functional'),
  };
}

/** A config that turns off every catalog rule whose stance has `key`. */
function turnedOff(name: string, key: 'conflict' | 'duplicateOf'): OopConfig {
  return {
    name,
    rules: Object.fromEntries(listExistingRules().flatMap(({ id, stance }) => (key in stance ? [[id, 'off']] : []))),
  };
}

function rulesOf(entries: readonly PresetEntry[], strict: boolean): NonNullable<OopConfig['rules']> {
  return Object.fromEntries(
    entries.map(({ id, setting, strictSetting }) => [id, strict ? (strictSetting ?? setting) : setting]),
  );
}

/** A rule a preset turns on: one of this plugin's own, or a cue from the catalog. */
interface PresetEntry {
  readonly id: string;
  readonly setting: 'error' | ['error', ...unknown[]];
  /** The setting in the strict presets, when it differs from `setting`. */
  readonly strictSetting?: ['error', ...unknown[]];
  readonly tier: Tier;
  readonly typed: boolean;
  readonly skipsTestFiles: boolean;
  /** The companion config the rule goes in instead of the presets, when it needs an optional plugin. */
  readonly companion: Companion | undefined;
}

// The catalog sources a consumer may lack: their cues go in their companion config.
const companions: readonly Companion[] = ['unicorn', 'sonarjs', 'functional'];

function ownRuleEntries(plugin: RegisteredPlugin): readonly PresetEntry[] {
  return Object.entries(plugin.rules).map(([name, rule]) => ({
    id: `${pluginNamespace}/${name}`,
    setting: 'error',
    ...(rule.meta.docs.strictOptions === undefined
      ? {}
      : { strictSetting: ['error', ...rule.meta.docs.strictOptions] satisfies PresetEntry['setting'] }),
    tier: rule.meta.docs.tier,
    typed: rule.meta.docs.requiresTypeChecking,
    skipsTestFiles: rule.meta.docs.skipsTestFiles === true,
    companion: rule.meta.docs.companion,
  }));
}

function cueEntries(): readonly PresetEntry[] {
  return listExistingRules().flatMap((row) => {
    const { id, source, stance } = row;

    return 'cue' in stance
      ? [
          {
            id,
            setting: ['error', ...(stance.options ?? [])],
            tier: stance.tier,
            typed: requiresTypeChecking(row),
            skipsTestFiles: false,
            companion: companions.find((name) => name === source),
          },
        ]
      : [];
  });
}

// Core rules never need type information.
function requiresTypeChecking({ source, name }: CatalogRow): boolean {
  return source === '@typescript-eslint' && tseslintPlugin.rules[name]?.meta.docs.requiresTypeChecking === true;
}
