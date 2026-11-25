import { testRule } from '../testing/rule-testers.ts';
import { maxLinesPerFunction } from './max-lines-per-function.ts';

testRule(maxLinesPerFunction, {
  valid: ['function f() {\n  const a = 1;\n\n  // note\n  const b = 2;\n  const c = 3;\n  const d = 4;\n  return a + b + c + d;\n}'],
  invalid: [
    {
      code: 'function f() {\n  const a = 1;\n  const b = 2;\n  const c = 3;\n  const d = 4;\n  const e = 5;\n  return a + b + c + d + e;\n}',
      errors: [{ messageId: 'found', data: { name: "Function 'f'", lineCount: 8, maxLines: 7 } }],
    },
  ],
});
