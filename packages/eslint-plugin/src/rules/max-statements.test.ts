import { testRule } from '../testing/rule-testers.ts';
import { maxStatements } from './max-statements.ts';

testRule(maxStatements, {
  valid: ['function f() { let a = 1; a += 1; a += 1; a += 1; return a; }'],
  invalid: [
    {
      code: 'function f() { let a = 1; a += 1; a += 1; a += 1; a += 1; return a; }',
      errors: [
        {
          messageId: 'found',
          data: { name: "Function 'f'", count: 6, max: 5 },
        },
      ],
    },
  ],
});
