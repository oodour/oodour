import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presetMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { classMethodsUseThis } from './class-methods-use-this.ts';

test('the strict preset reports a method that uses no state with a message that names the smell, the cure and why no change is automatic', () => {
  const messages = presetMessages('strict', 'class-methods-use-this', 'class NoDiscount { rate() { return 0; } }', 'discount.ts');

  assert.deepEqual(messages, [
    "Stop and look: Feature Envy, the method 'rate' uses no state of its object. Look at whose data it reads. Cure: " +
      'Move Function to that object, or to a module function for a pure calculation; keep `static` only for a method ' +
      "that builds an instance. No automatic change: the method's new home is a design choice.",
  ]);
});

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
