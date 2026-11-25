import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import type { Companion, OopRuleModule, Tier } from './create-rule.ts';
import { listExistingRules, type CatalogRow } from './existing-rules.ts';

/** The prefix of this plugin's rule IDs: `@oodour/type-hopping-chain`. */
export const pluginNamespace = '@oodour';

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

/**
 * Where a rule with `skipsTestFiles` stays off: test files by the naming conventions and test folders RuboCop and Qlty
 * treat as tests, and declaration files. fallow-config uses the same test globs, without the declaration-file one.
 */
export const testFileGlobs = [
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__/**',
  '**/test/**',
  '**/tests/**',
  '**/spec/**',
  '**/e2e/**',
  '**/*.d.ts',
];

// A type literal, not an interface: ESLint's `Plugin.configs` is a string-keyed record, and only a type literal is
// assignable to one without an index signature of its own.
export type OopConfigs = {
  readonly recommended: OopConfig[];
  readonly 'recommended-type-checked': OopConfig[];
  readonly strict: OopConfig[];
  readonly 'strict-type-checked': OopConfig[];
  readonly recommendedTypeChecked: OopConfig[];
  readonly strictTypeChecked: OopConfig[];
  /** Only the conflicts turned off, for a consumer who wants their own setup to stop working against OOdour. */
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
    name: 'oodour/plugins',
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
      name: `oodour/${source}`,
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
  const conflicts = turnedOff('oodour/conflicts', 'conflict');
  const duplicates = turnedOff('oodour/duplicates', 'duplicateOf');
  const preset = (name: string, keep: (entry: PresetEntry) => boolean, strict = false): OopConfig[] => [
    plugins,
    ...layers(name, keep, strict),
    duplicates,
    conflicts,
  ];
  const recommendedTypeChecked = preset('oodour/recommended-type-checked', recommendedTier);
  const strictTypeChecked = preset('oodour/strict-type-checked', () => true, true);

  return {
    recommended: preset('oodour/recommended', (entry) => recommendedTier(entry) && untyped(entry) && !entry.defaultsNeedTypes),
    'recommended-type-checked': recommendedTypeChecked,
    strict: preset('oodour/strict', untyped, true),
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
  readonly defaultsNeedTypes: boolean;
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
    defaultsNeedTypes: rule.meta.docs.defaultsNeedTypes === true,
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
            defaultsNeedTypes: false,
            skipsTestFiles: false,
            companion: companions.find((name) => name === source),
          },
        ]
      : [];
  });
}

// Core rules never need type information.
function requiresTypeChecking({ source, name }: CatalogRow): boolean {
  return (
    tseslintPlugin.rules[name]?.meta.docs.requiresTypeChecking === true &&
    // Stryker disable next-line ConditionalExpression: no catalog row from another source shares a typed typescript-eslint rule's name
    source === '@typescript-eslint'
  );
}
