import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { defineConfig } from 'eslint/config';
import functional from 'eslint-plugin-functional';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';
import plugin, { type OopPlugin } from './index.ts';

const typeHoppingChain = '@layzee/oop/type-hopping-chain';

// The consumer's view: `defineConfig` with typescript-eslint's parser for TypeScript files, then the preset. Type-checking
// this file is what proves the presets are accepted where a consumer writes them.
async function ruleSetting(
  preset: keyof OopPlugin['configs'],
  ruleId: string,
  ...after: Parameters<typeof defineConfig>
): Promise<unknown> {
  const eslint = new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
      plugin.configs[preset],
      ...after,
    ),
  });
  const config: unknown = await eslint.calculateConfigForFile('file.ts');

  if (typeof config !== 'object' || config === null || !('rules' in config)) {
    return undefined;
  }

  const { rules } = config;

  if (typeof rules !== 'object' || rules === null) {
    return undefined;
  }

  return Object.entries(rules).find(([id]) => id === ruleId)?.[1];
}

test('strict-type-checked turns type-hopping-chain on at error', async () => {
  assert.deepEqual(await ruleSetting('strict-type-checked', typeHoppingChain), [2, { maxInterfaces: 2 }]);
});

test('strict turns on a core cue of the strict tier at error with its catalog options', async () => {
  assert.deepEqual(await ruleSetting('strict', 'max-params'), [2, { max: 4 }]);
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
  assert.equal(await ruleSetting('recommended', 'max-params'), undefined);
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
    await ruleSetting('strict-type-checked', typeHoppingChain, { plugins: { '@layzee/oop': plugin } }),
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
