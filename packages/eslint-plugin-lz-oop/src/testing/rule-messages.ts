import { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import plugin from '../index.ts';

/**
 * Lints code with the recommended preset and one of the plugin's rules set to the given options, and returns the
 * messages that rule reports, so a test can check the full message text and the option schema.
 */
export function ruleMessages(name: string): (code: string, options: Record<string, unknown>) => readonly string[] {
  const ruleId = `${plugin.meta.namespace}/${name}`;

  return (code, options) =>
    new Linter({ configType: 'flat' })
      .verify(code, defineConfig(plugin.configs.recommended, { rules: { [ruleId]: ['error', options] } }))
      .filter((message) => message.ruleId === ruleId)
      .map(({ message }) => message);
}
