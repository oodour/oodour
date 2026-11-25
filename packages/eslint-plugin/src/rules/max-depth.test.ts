import { testRule } from '../testing/rule-testers.ts';
import { maxDepth } from './max-depth.ts';

testRule(maxDepth, {
  valid: [
    'function f(a) { if (a) { if (a) { a = 0; } } }',
    { code: 'function f(a) { if (a) { if (a) { if (a) { a = 0; } } } }', options: [{ max: 3 }] },
  ],
  invalid: [
    {
      code: 'function f(a) { if (a) { if (a) { if (a) { a = 0; } } } }',
      errors: [{ messageId: 'found', data: { depth: 3, maxDepth: 2 } }],
    },
  ],
});
