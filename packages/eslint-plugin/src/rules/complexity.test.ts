import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presetMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { complexity } from './complexity.ts';

const ifs = (count: number): string =>
  `function f(a) {\n${Array.from({ length: count }, (_, index) => `  if (a === ${String(index)}) { a = 0; }\n`).join('')}}`;

test('the strict preset reports a function with too many paths with a message that names the smell, the counts and the cures', () => {
  assert.deepEqual(presetMessages('strict', 'complexity', ifs(4), 'f.ts'), [
    "Stop and look: Conditional Complexity, Function 'f' has 5 paths (at most 4), each one more test. Look for " +
      'branches that do the work of one kind each, or the same absence check repeated. Cure: Decompose Conditional, ' +
      'Replace Conditional with Polymorphism, or Introduce Special Case. A factory that picks a class by case is ' +
      'where that choice belongs: keep it as the one place and state the exception, or use a factory map from key to ' +
      'class when the list is better kept as data. No automatic change: which pieces to split out, and their names, ' +
      'are for a person to choose.',
  ]);
});

testRule(complexity, {
  valid: [ifs(3)],
  invalid: [
    {
      code: ifs(4),
      errors: [
        {
          messageId: 'found',
          data: { name: "Function 'f'", complexity: 5, max: 4 },
        },
      ],
    },
  ],
});
