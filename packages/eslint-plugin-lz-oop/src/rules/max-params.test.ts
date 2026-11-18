import { testRule } from '../testing/rule-testers.ts';
import { maxParams } from './max-params.ts';

testRule(maxParams, {
  valid: ['function f(this: void, a: number, b: number, c: number) {}'],
  invalid: [
    {
      code: 'function f(a: number, b: number, c: number, d: number) {}',
      errors: [{ messageId: 'found', data: { name: "Function 'f'", count: 4, max: 3 } }],
    },
  ],
});
