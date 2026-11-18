import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { defineConfig } from 'eslint/config';
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
