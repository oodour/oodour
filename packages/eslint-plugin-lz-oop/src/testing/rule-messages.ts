import { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import plugin from '../index.ts';

type Config = ReturnType<typeof defineConfig>;

/**
 * Lints code with the recommended preset and one of the plugin's rules set to the given options, and returns the
 * messages that rule reports, so a test can check the full message text and the option schema.
 */
export function ruleMessages(name: string): (code: string, options: Record<string, unknown>) => readonly string[] {
  return (code, options) =>
    messagesOf(name, code, defineConfig(plugin.configs.recommended, { rules: { [ruleId(name)]: ['error', options] } }));
}

/**
 * Lints a file with one of the plugin's presets as it ships, TypeScript files through typescript-eslint's parser, and
 * returns the messages one rule reports, so a test can check that the preset turns the rule on with its message.
 */
export function presetMessages(
  preset: 'recommended' | 'strict',
  name: string,
  code: string,
  filename: string,
): readonly string[] {
  const config = defineConfig({ files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } }, plugin.configs[preset]);

  return messagesOf(name, code, config, filename);
}

function messagesOf(name: string, code: string, config: Config, filename?: string): readonly string[] {
  return new Linter({ configType: 'flat' })
    .verify(code, config, filename)
    .filter((message) => message.ruleId === ruleId(name))
    .map(({ message }) => message);
}

function ruleId(name: string): string {
  return `${plugin.meta.namespace}/${name}`;
}
