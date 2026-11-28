import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presetMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { maxLinesPerFunction } from './max-lines-per-function.ts';

const eightLines =
  'function f() {\n  const a = 1;\n  const b = 2;\n  const c = 3;\n  const d = 4;\n  const e = 5;\n  return a + b + c + d + e;\n}';

test('the strict preset reports a function with too many lines with a message that names the smell, the counts and the cure', () => {
  assert.deepEqual(
    presetMessages('strict', 'max-lines-per-function', eightLines, 'f.ts'),
    [
      "Stop and look: Long Function, Function 'f' has 8 lines of code (at most 7). Look for steps that each do one " +
        'thing, or a block a comment has to explain. Cure: Extract Function for each step, named for what it does. No ' +
        'automatic change: which pieces to split out, and their names, are for a person to choose.',
    ],
  );
});

testRule(maxLinesPerFunction, {
  valid: [
    'function f() {\n  const a = 1;\n\n  // note\n  const b = 2;\n  const c = 3;\n  const d = 4;\n  return a + b + c + d;\n}',
  ],
  invalid: [
    {
      code: eightLines,
      errors: [
        {
          messageId: 'found',
          data: { name: "Function 'f'", lineCount: 8, maxLines: 7 },
        },
      ],
    },
  ],
});
