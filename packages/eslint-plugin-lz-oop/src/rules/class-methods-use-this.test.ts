import { testRule } from '../testing/rule-testers.ts';
import { classMethodsUseThis } from './class-methods-use-this.ts';

testRule(classMethodsUseThis, {
  valid: [
    'interface Discount { rate(): number }\nclass NoDiscount implements Discount { rate() { return 0; } }',
    'class Discount { factor = 1; rate() { return this.factor; } }\nclass NoDiscount extends Discount { override rate() { return 0; } }',
    'class Money { constructor(cents) { this.cents = cents; } static zero() { return new Money(0); } }',
  ],
  invalid: [
    {
      code: 'class Invoice { format(total: number) { return `$${String(total)}`; } }',
      errors: [{ messageId: 'found', data: { name: "method 'format'" } }],
    },
    // The documented limit: a Null Object that plays its role without declaring `implements` is reported.
    {
      code: 'class NoDiscount { rate() { return 0; } }',
      errors: [{ messageId: 'found', data: { name: "method 'rate'" } }],
    },
  ],
});
