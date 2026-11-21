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
import { testFileGlobs } from './presets.ts';
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
  const recommended: readonly string[] = [];
  const strictOnly = [
    'module-let',
    'new-collaborator',
    'optional-collaborator',
    'optional-private-field',
    'switch-on-kind',
  ];
  const ids = (names: readonly string[]): readonly string[] => names.map((name) => `@layzee/lz-oop/${name}`).sort();

  const settings = await Promise.all(presetNames.map((preset) => selectorRuleSettings(preset, 'file.ts')));

  assert.deepEqual(
    settings.map((setting) => Object.keys(setting).sort()),
    [ids(recommended), ids(recommended), ids([...recommended, ...strictOnly]), ids([...recommended, ...strictOnly])],
  );
});

const testFiles = [
  'cart.test.ts',
  'cart.spec.ts',
  '__tests__/cart.ts',
  'test/cart.ts',
  'tests/cart.ts',
  'spec/cart.ts',
  'e2e/cart.ts',
];

// The same list as `testFiles` in fallow-config-lz-oop's tests: change both together.
test('the test-file globs are the test files of RuboCop and Qlty, and declaration files', () => {
  assert.deepEqual(testFileGlobs, [
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
    '**/test/**',
    '**/tests/**',
    '**/spec/**',
    '**/e2e/**',
    '**/*.d.ts',
  ]);
});

test('in a test file, strict-type-checked leaves out exactly the rules that check production code only', async () => {
  const ownRuleIds = async (filePath: string): Promise<ReadonlySet<string>> =>
    new Set(
      (await ruleSettings('strict-type-checked', filePath))
        .filter(([id, setting]) => id.startsWith('@layzee/lz-oop/') && severityOf(setting) === 2)
        .map(([id]) => id),
    );
  const production = await ownRuleIds('file.ts');
  const expected = [
    ...selectorRules.map(({ name }) => name),
    'max-lines-per-function',
    'class-methods-use-this',
    'flag-argument',
    'repeated-switches',
    'manual-dispatch',
    'data-clumps',
    'feature-envy',
  ]
    .map((name) => `@layzee/lz-oop/${name}`)
    .sort();

  const skipped = await Promise.all(
    testFiles.map(async (file) => {
      const inTests = await ownRuleIds(file);

      return [...production].filter((id) => !inTests.has(id)).sort();
    }),
  );

  assert.deepEqual(
    skipped,
    testFiles.map(() => expected),
  );
});

test('no preset turns a selector rule on in a test file or a declaration file', async () => {
  const files = [...testFiles, 'cart.d.ts'];

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
  assert.deepEqual(await ruleSetting('strict', 'no-param-reassign'), [2, { props: true }]);
});

test("each preset names its rule layers after itself, so ESLint's config inspector tells them apart", () => {
  assert.deepEqual(
    presetNames.map((preset) => plugin.configs[preset].map(({ name }) => name).slice(1, 3)),
    presetNames.map((preset) => [`lz-oop/${preset}`, `lz-oop/${preset}/outside-test-files`]),
  );
});

test('each preset sets the ABC, Flog and Halstead limits of its tier', async () => {
  const ids = ['abc-size', 'flog-score', 'halstead-volume'].map((name) => `@layzee/lz-oop/${name}`);

  const settings = await Promise.all(presetNames.map((preset) => Promise.all(ids.map((id) => ruleSetting(preset, id)))));

  const recommended = [15, 25, 750].map((max) => [2, { max }]);
  const strict = [10, 15, 400].map((max) => [2, { max }]);

  assert.deepEqual(settings, [recommended, recommended, strict, strict]);
});

const sizeLimits = {
  'max-lines-per-function': { max: 7, skipBlankLines: true, skipComments: true },
  'max-statements': { max: 5 },
  'max-params': { max: 3 },
  complexity: { max: 4 },
  'max-depth': { max: 2 },
};

test('strict turns on each size limit as a rule of this plugin, at error with its limit', async () => {
  const settings = await Promise.all(
    Object.keys(sizeLimits).map((name) => ruleSetting('strict', `@layzee/lz-oop/${name}`)),
  );

  assert.deepEqual(
    settings,
    Object.values(sizeLimits).map((options) => [2, options]),
  );
});

test('each preset sets the parameter limit of its tier: four in recommended, three in strict', async () => {
  const settings = await Promise.all(presetNames.map((preset) => ruleSetting(preset, '@layzee/lz-oop/max-params')));

  const recommended = [2, { max: 4 }];
  const strict = [2, { max: 3 }];

  assert.deepEqual(settings, [recommended, recommended, strict, strict]);
});

test('strict turns on max-class-lines at 110 lines, not counting blank lines and comments', async () => {
  assert.deepEqual(await ruleSetting('strict', '@layzee/lz-oop/max-class-lines'), [
    2,
    { max: 110, skipBlankLines: true, skipComments: true },
  ]);
});

test('every preset turns off the size limits it wraps, so each finding is reported once, under our message', async () => {
  const wrapped = [...Object.keys(sizeLimits), '@typescript-eslint/max-params', 'sonarjs/cognitive-complexity'];

  const settings = await Promise.all(
    presetNames.flatMap((preset) => wrapped.map(async (id) => severityOf(await ruleSetting(preset, id)))),
  );

  assert.deepEqual(
    settings,
    presetNames.flatMap(() => wrapped.map(() => 0)),
  );
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

test('recommended turns on an untyped typescript-eslint cue of the recommended tier and registers its plugin', async () => {
  assert.deepEqual(await ruleSetting('recommended', '@typescript-eslint/no-extraneous-class'), [2]);
});

test('recommended-type-checked turns on a typed cue of the recommended tier with its catalog options', async () => {
  assert.deepEqual(await ruleSetting('recommended-type-checked', '@typescript-eslint/switch-exhaustiveness-check'), [
    2,
    { considerDefaultExhaustiveForUnions: false },
  ]);
});

test('every preset turns flag-argument and repeated-switches on at error, rules of the recommended tier', async () => {
  const ids = ['@layzee/lz-oop/flag-argument', '@layzee/lz-oop/repeated-switches'];
  const settings = await Promise.all(
    presetNames.map(async (preset) => Promise.all(ids.map(async (id) => ruleSetting(preset, id)))),
  );

  assert.deepEqual(settings, presetNames.map(() => [[2], [2]]));
});

test('only the strict presets turn manual-dispatch, data-clumps and feature-envy on, rules of the strict tier', async () => {
  const ids = ['@layzee/lz-oop/manual-dispatch', '@layzee/lz-oop/data-clumps', '@layzee/lz-oop/feature-envy'];
  const settings = await Promise.all(
    presetNames.map(async (preset) => Promise.all(ids.map(async (id) => ruleSetting(preset, id)))),
  );

  assert.deepEqual(
    settings,
    presetNames.map((preset) => ids.map(() => (preset.startsWith('strict') ? [2] : undefined))),
  );
});

test('every preset turns private-access on in production and test files, the strict ones with underscore members', async () => {
  const settings = await Promise.all(
    presetNames.map(async (preset) =>
      Promise.all(
        ['file.ts', 'cart.test.ts'].map(
          async (file) => (await ruleSettings(preset, file)).find(([id]) => id === '@layzee/lz-oop/private-access')?.[1],
        ),
      ),
    ),
  );

  assert.deepEqual(
    settings,
    presetNames.map((preset) => {
      const setting = [2, { underscore: preset.startsWith('strict') }];

      return [setting, setting];
    }),
  );
});

test('recommended leaves out a cue of the strict tier', async () => {
  assert.equal(await ruleSetting('recommended', 'no-param-reassign'), undefined);
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

test('no preset turns on the cognitive-complexity limit, which needs eslint-plugin-sonarjs installed', async () => {
  const settings = await Promise.all(presetNames.map((preset) => ruleSetting(preset, '@layzee/lz-oop/cognitive-complexity')));

  assert.deepEqual(settings, presetNames.map(() => undefined));
});

test('the sonarjs companion turns on the cognitive-complexity limit as a rule of this plugin, at its limit', async () => {
  assert.deepEqual(await ruleSetting('sonarjs', '@layzee/lz-oop/cognitive-complexity'), [2, 4]);
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
