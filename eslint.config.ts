import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', '.oracle/**', '**/.claude-plugin/types/**', '.claude/worktrees/**', '.stryker-tmp/**'] },
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
  {
    // The engine's generic `on` overloads expand each hook parameter to a union of every event's hook,
    // which this check walks for each call: minutes per file against 1 s for tsc. Hooks return
    // `Result | Promise<Result>`, never void, so the check cannot fire on them.
    files: ['.claude/mods/*/hooks/**/*.ts'],
    rules: { '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false } }] },
  },
);
