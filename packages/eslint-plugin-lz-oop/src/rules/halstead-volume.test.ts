import { testRule } from '../testing/rule-testers.ts';
import { halsteadVolume } from './halstead-volume.ts';

testRule(halsteadVolume, {
  valid: ['function f(a, b) { return a + b; }'],
  invalid: [
    {
      // The annotation `: string` is left out: operators function ( { return ; (5, 5), operands f p p (2 distinct, 3).
      code: 'function f(p: string) { return p; }',
      options: [{ max: 0 }],
      errors: [{ messageId: 'found', data: { name: "function 'f'", volume: '22.5', max: 0, length: 8, vocabulary: 7 } }],
    },
    {
      // f leaves out the arrow: function ( { const = ; and f g (8 distinct, 8 total). The arrow: ( => and 1.
      code: 'function f() { const g = () => 1; }',
      options: [{ max: 0 }],
      errors: [
        { messageId: 'found', data: { name: "function 'f'", volume: '24.0', max: 0, length: 8, vocabulary: 8 } },
        { messageId: 'found', data: { name: "arrow function 'g'", volume: '4.8', max: 0, length: 3, vocabulary: 3 } },
      ],
    },
    {
      // Operators: function ( , { return + ; (7 distinct, 7 total). Operands: f a b a b (3 distinct, 5 total).
      code: 'function f(a, b) { return a + b; }',
      options: [{ max: 0 }],
      errors: [{ messageId: 'found', data: { name: "function 'f'", volume: '39.9', max: 0, length: 12, vocabulary: 10 } }],
    },
  ],
});
