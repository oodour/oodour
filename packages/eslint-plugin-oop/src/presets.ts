import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import type { OopRuleModule, Tier } from './create-rule.ts';
import { existingRules, listExistingRules, type CatalogRow, type SourceId } from './existing-rules.ts';

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
  readonly rules?: Readonly<Record<string, 'error' | 'off' | ['error', ...unknown[]]>>;
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
    name: 'oop/plugins',
    plugins: { [pluginNamespace]: plugin, '@typescript-eslint': tseslintPlugin },
  };
  const entries = [...ownRuleEntries(plugin), ...cueEntries((source) => !existingRules[source].optional)];
  const layer = (name: string, keep: (entry: PresetEntry) => boolean): OopConfig => ({
    name,
    rules: rulesOf(entries.filter(keep)),
  });
  const untyped = (entry: PresetEntry): boolean => !entry.typed;
  const recommendedTier = (entry: PresetEntry): boolean => entry.tier === 'recommended';
  const conflicts: OopConfig = {
    name: 'oop/conflicts',
    rules: Object.fromEntries(
      listExistingRules().flatMap(({ id, stance }) => ('conflict' in stance ? [[id, 'off']] : [])),
    ),
  };
  const recommendedTypeChecked = [plugins, layer('oop/recommended-type-checked', recommendedTier), conflicts];
  const strictTypeChecked = [plugins, layer('oop/strict-type-checked', () => true), conflicts];

  return {
    recommended: [plugins, layer('oop/recommended', (entry) => recommendedTier(entry) && untyped(entry)), conflicts],
    'recommended-type-checked': recommendedTypeChecked,
    strict: [plugins, layer('oop/strict', untyped), conflicts],
    'strict-type-checked': strictTypeChecked,
    recommendedTypeChecked,
    strictTypeChecked,
    conflicts: [conflicts],
    unicorn: companion('unicorn'),
    sonarjs: companion('sonarjs'),
    functional: companion('functional'),
  };
}

function companion(source: SourceId): OopConfig[] {
  return [{ name: `oop/${source}`, rules: rulesOf(cueEntries((from) => from === source)) }];
}

function rulesOf(entries: readonly PresetEntry[]): NonNullable<OopConfig['rules']> {
  return Object.fromEntries(entries.map(({ id, setting }) => [id, setting]));
}

/** A rule a preset turns on: one of this plugin's own, or a cue from the catalog. */
interface PresetEntry {
  readonly id: string;
  readonly setting: 'error' | ['error', ...unknown[]];
  readonly tier: Tier;
  readonly typed: boolean;
}

function ownRuleEntries(plugin: RegisteredPlugin): readonly PresetEntry[] {
  return Object.entries(plugin.rules).map(([name, rule]) => ({
    id: `${pluginNamespace}/${name}`,
    setting: 'error',
    tier: rule.meta.docs.tier,
    typed: rule.meta.docs.requiresTypeChecking,
  }));
}

// Cues of an optional plugin go in its companion config, since turning on a rule of an unregistered plugin throws.
function cueEntries(fromSource: (source: SourceId) => boolean): readonly PresetEntry[] {
  return listExistingRules()
    .filter(({ source }) => fromSource(source))
    .flatMap((row) => {
      const { id, stance } = row;

      return 'cue' in stance
        ? [{ id, setting: ['error', ...(stance.options ?? [])], tier: stance.tier, typed: requiresTypeChecking(row) }]
        : [];
    });
}

// Core rules never need type information.
function requiresTypeChecking({ source, name }: CatalogRow): boolean {
  return source === '@typescript-eslint' && tseslintPlugin.rules[name]?.meta.docs.requiresTypeChecking === true;
}
