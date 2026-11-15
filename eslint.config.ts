import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', '.oracle/**', '**/.claude-plugin/types/**'] },
  {
    files: ['.claude/hooks/**/*.ts', 'tools/**/*.ts', '.claude/mods/*/hooks/**/*.ts', '.claude/mods/*/.node-test/*.ts', '*.test.ts'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [{ from: 'package', name: ['describe', 'it', 'suite', 'test'], package: 'node:test' }],
        },
      ],
    },
  },
);
