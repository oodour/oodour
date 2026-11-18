import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { defineConfig } from 'eslint/config';
import functional from 'eslint-plugin-functional';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';
import plugin, { type LzOopPlugin } from './index.ts';
import { selectorRules } from './rules/selector-rules.ts';

const typeHoppingChain = '@layzee/lz-oop/type-hopping-chain';

// The consumer's view: `defineConfig` with typescript-eslint's parser for TypeScript files, then the preset. Type-checking
// this file is what proves the presets are accepted where a consumer writes them.
async function ruleSettings(
  preset: keyof LzOopPlugin['configs'],
  filePath: string,
  ...after: Parameters<typeof defineConfig>
): Promise<readonly (readonly [string, unknown])[]> {
  const eslint = new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
      plugin.configs[preset],
      ...after,
    ),
  });
  const config: unknown = await eslint.calculateConfigForFile(filePath);

  if (typeof config !== 'object' || config === null || !('rules' in config)) {
    return [];
  }

  const { rules } = config;

  if (typeof rules !== 'object' || rules === null) {
    return [];
  }

  return Object.entries(rules);
}

async function ruleSetting(
  preset: keyof LzOopPlugin['configs'],
  ruleId: string,
  ...after: Parameters<typeof defineConfig>
): Promise<unknown> {
  return (await ruleSettings(preset, 'file.ts', ...after)).find(([id]) => id === ruleId)?.[1];
}

const presetNames = ['recommended', 'recommended-type-checked', 'strict', 'strict-type-checked'] as const;

async function selectorRuleSettings(
  preset: keyof LzOopPlugin['configs'],
  filePath: string,
): Promise<Readonly<Record<string, unknown>>> {
  const selectorRuleIds = new Set(selectorRules.map(({ name }) => `@layzee/lz-oop/${name}`));

  return Object.fromEntries((await ruleSettings(preset, filePath)).filter(([id]) => selectorRuleIds.has(id)));
}

test("each preset turns on exactly its tier's selector rules, at error", async () => {
  const settings = await Promise.all(presetNames.map((preset) => selectorRuleSettings(preset, 'file.ts')));

  assert.deepEqual(
    settings,
    presetNames.map((preset) =>
      Object.fromEntries(
        selectorRules
          .filter(({ meta }) => preset.startsWith('strict') || meta.docs.tier === 'recommended')
          .map(({ name }) => [`@layzee/lz-oop/${name}`, [2]]),
      ),
    ),
  );
});

test('the selector rules ship in the tiers the measurements set', async () => {
  const recommended = ['switch-on-kind', 'ts-private'];
  const strictOnly = [
    'module-let',
    'new-in-constructor',
    'optional-collaborator',
    'optional-private-field',
    'options-object-keys',
  ];
  const ids = (names: readonly string[]): readonly string[] => names.map((name) => `@layzee/lz-oop/${name}`).sort();

  const settings = await Promise.all(presetNames.map((preset) => selectorRuleSettings(preset, 'file.ts')));

  assert.deepEqual(
    settings.map((setting) => Object.keys(setting).sort()),
    [ids(recommended), ids(recommended), ids([...recommended, ...strictOnly]), ids([...recommended, ...strictOnly])],
  );
});

test('no preset turns a selector rule on in a test file or a declaration file', async () => {
  const files = ['cart.test.ts', 'cart.spec.ts', '__tests__/cart.ts', 'cart.d.ts'];

  const settings = await Promise.all(
    presetNames.flatMap((preset) => files.map((file) => selectorRuleSettings(preset, file))),
  );

  assert.deepEqual(
    settings,
    presetNames.flatMap(() => files.map(() => ({}))),
  );
});

test('strict-type-checked turns type-hopping-chain on at error', async () => {
  assert.deepEqual(await ruleSetting('strict-type-checked', typeHoppingChain), [2, { maxInterfaces: 2 }]);
});

test('strict turns on a core cue of the strict tier at error with its catalog options', async () => {
  assert.deepEqual(await ruleSetting('strict', 'max-statements'), [2, { max: 5 }]);
});

test('strict turns on the typescript-eslint max-params at three parameters', async () => {
  assert.deepEqual(await ruleSetting('strict', '@typescript-eslint/max-params'), [2, { max: 3 }]);
});

test('every preset requires a reason on each comment that turns a rule off', async () => {
  const settings = await Promise.all(
    presetNames.map((preset) => ruleSetting(preset, '@eslint-community/eslint-comments/require-description')),
  );

  assert.deepEqual(
    settings,
    presetNames.map(() => [2, { ignore: ['eslint-enable', 'eslint-env', 'exported', 'global', 'globals'] }]),
  );
});

test('every preset turns off the core max-params, so a function is reported once', async () => {
  const settings = await Promise.all(presetNames.map((preset) => ruleSetting(preset, 'max-params')));

  assert.deepEqual(settings.map(severityOf), presetNames.map(() => 0));
});

test('recommended turns on an untyped typescript-eslint cue of the recommended tier and registers its plugin', async () => {
  assert.deepEqual(await ruleSetting('recommended', '@typescript-eslint/no-extraneous-class'), [2]);
});

test('recommended-type-checked turns on a typed cue of the recommended tier with its catalog options', async () => {
  assert.deepEqual(await ruleSetting('recommended-type-checked', '@typescript-eslint/switch-exhaustiveness-check'), [
    2,
    { considerDefaultExhaustiveForUnions: false },
  ]);
});

test('recommended leaves out a cue of the strict tier', async () => {
  assert.equal(await ruleSetting('recommended', 'max-statements'), undefined);
});

test('strict leaves out a cue that needs type information', async () => {
  assert.equal(await ruleSetting('strict', '@typescript-eslint/prefer-readonly'), undefined);
});

test('every preset turns off the conflicts', async () => {
  const presets = ['recommended', 'recommended-type-checked', 'strict', 'strict-type-checked'] as const;

  const settings = await Promise.all(presets.map((preset) => ruleSetting(preset, 'no-else-return')));

  assert.deepEqual(settings.map(severityOf), presets.map(() => 0));
});

test('a preset turns off a conflict of a plugin the consumer has not registered, without an error', async () => {
  assert.equal(severityOf(await ruleSetting('recommended', 'unicorn/no-static-only-class')), 0);
});

test('the conflicts config holds the conflicts layer alone', () => {
  assert.deepEqual(plugin.configs.conflicts, [plugin.configs.recommended.at(-1)]);
});

test('the unicorn companion turns on the unicorn cues for a consumer who registered unicorn', async () => {
  assert.equal(severityOf(await ruleSetting('unicorn', 'unicorn/no-array-sort', { plugins: { unicorn } })), 2);
});

test('the sonarjs companion turns on the sonarjs cues with their catalog options', async () => {
  assert.deepEqual(await ruleSetting('sonarjs', 'sonarjs/cognitive-complexity', { plugins: { sonarjs } }), [2, 5]);
});

test('the functional companion turns on the functional cues with their catalog options', async () => {
  assert.deepEqual(
    await ruleSetting('functional', 'functional/immutable-data', { plugins: { functional } }),
    [2, { ignoreClasses: 'fieldsOnly' }],
  );
});

// ESLint checks each rule's options against its schema when it builds the config, so a bad option fails here.
test('every config loads through the installed ESLint with type information and the optional plugins', async () => {
  const configs = Object.values(plugin.configs);
  const fixture = join(import.meta.dirname, '..', 'tests', 'typed-fixture');

  const results = await Promise.all(
    configs.map(async (config) => {
      const eslint = new ESLint({
        cwd: fixture,
        overrideConfigFile: true,
        overrideConfig: defineConfig(
          {
            files: ['**/*.ts'],
            languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true, tsconfigRootDir: fixture } },
            plugins: { unicorn, sonarjs, functional },
          },
          config,
        ),
      });
      const [result] = await eslint.lintText('export {};\n', { filePath: join(fixture, 'file.ts') });

      return result?.messages;
    }),
  );

  assert.deepEqual(results, configs.map(() => []));
});

// ESLint fills in a rule's default options even when the rule is off, so a test of an "off" entry reads its severity.
function severityOf(setting: unknown): unknown {
  const values: readonly unknown[] = Array.isArray(setting) ? setting : [setting];

  return values[0];
}

test('strict leaves out type-hopping-chain, which needs type information', async () => {
  assert.equal(await ruleSetting('strict', typeHoppingChain), undefined);
});

test('recommended-type-checked leaves out type-hopping-chain, which is in the strict tier', async () => {
  assert.equal(await ruleSetting('recommended-type-checked', typeHoppingChain), undefined);
});

test('recommended lints TypeScript without type information', async () => {
  const eslint = new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
      plugin.configs.recommended,
    ),
  });

  const [result] = await eslint.lintText('const order = { customer: { address: { city: 1 } } };\norder.customer.address.city;\n', {
    filePath: 'file.ts',
  });

  assert.deepEqual(result?.messages, []);
});

test('the camelCase aliases are the same configs as their kebab-case presets', () => {
  assert.equal(plugin.configs.recommendedTypeChecked, plugin.configs['recommended-type-checked']);
  assert.equal(plugin.configs.strictTypeChecked, plugin.configs['strict-type-checked']);
});

test('a consumer may register the default export again under the same name', async () => {
  assert.deepEqual(
    await ruleSetting('strict-type-checked', typeHoppingChain, { plugins: { '@layzee/lz-oop': plugin } }),
    [2, { maxInterfaces: 2 }],
  );
});

test('every preset registers the plugin, so a consumer can turn on a rule the preset leaves out', async () => {
  const presets = ['recommended', 'recommended-type-checked', 'strict', 'strict-type-checked'] as const;

  const settings = await Promise.all(
    presets.map((preset) =>
      ruleSetting(preset, typeHoppingChain, { rules: { [typeHoppingChain]: ['error', { maxInterfaces: 3 }] } }),
    ),
  );

  assert.deepEqual(settings, presets.map(() => [2, { maxInterfaces: 3 }]));
});
