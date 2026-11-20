import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import plugin from '../index.ts';

const ruleId = `${plugin.meta.namespace}/halstead-volume`;

function lint(code: string, filename: string, options: Record<string, unknown>): readonly string[] {
  const config = defineConfig(
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    },
    plugin.configs.recommended,
    { rules: { [ruleId]: ['error', options] } },
  );

  return new Linter({ configType: 'flat' })
    .verify(code, config, filename)
    .filter((message) => message.ruleId === ruleId)
    .map(({ message }) => message);
}

test('halstead-volume reports with a message that names the smell, the counts and the cure', () => {
  assert.deepEqual(lint('function f(a, b) { return a + b; }', 'file.ts', { max: 0 }), [
    "Stop and look: Long Function, function 'f' has Halstead volume 39.9 (at most 0) from 12 uses of 10 distinct " +
      'operators and operands, more than a reader holds at once. A long length means many steps; a large vocabulary ' +
      'means many names and operations to tell apart. Cure: Extract Function for each step, Replace Temp with Query, ' +
      'or Introduce Parameter Object for values that travel together. No automatic change: which pieces to split out, ' +
      'and their names, are for a person to choose.',
  ]);
});

test('halstead-volume counts JSX names and JSX text as operands', () => {
  // Operators: function ( { return < > < / > ; (8 distinct, 10 total). Operands: f p hi p (3 distinct, 4 total).
  const [message] = lint('function f() { return <p>hi</p>; }', 'file.tsx', { max: 0 });

  assert.match(message ?? '', /from 14 uses of 11 distinct/);
});

test('halstead-volume rejects an option it does not know', () => {
  assert.throws(() => lint('', 'file.ts', { max: 1, limit: 1 }), /additional properties/);
});
