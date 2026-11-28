import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presetMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { repeatedSwitches } from './repeated-switches.ts';

test('the recommended preset reports each repeated switch with a message that names the smell, the cases and the cure', () => {
  const messages = presetMessages(
    'recommended',
    'repeated-switches',
    'function a(n) { switch (n) { case 0: return 1; case 1: return 2; } } function b(n) { switch (n) { case 1: return 3; case 0: return 4; } }',
    'song.js',
  );
  const expected =
    'Stop and look: Repeated Switches, this file has 2 switches on the cases 0, 1. Look for the same choice in other ' +
    'files. Cure: Replace Conditional with Polymorphism, an object per case chosen once by a factory, so each switch ' +
    'becomes a message to that object. No automatic change: which objects take over each case is a design decision no ' +
    'tool can make.';

  assert.deepEqual(messages, [expected, expected]);
});

testRule(repeatedSwitches, {
  valid: [
    {
      name: 'one switch',
      code: "function postage(parcel) { switch (parcel.kind) { case 'letter': return 1; case 'crate': return 9; } }",
    },
    {
      name: 'two switches on different cases',
      code: `
        function postage(parcel) { switch (parcel.kind) { case 'letter': return 1; case 'crate': return 9; } }
        function state(order) { switch (order.status) { case 'open': return 1; case 'paid': return 2; } }
      `,
    },
    {
      name: 'two switches with only a default',
      code: 'function a(x) { switch (x) { default: return 1; } } function b(y) { switch (y) { default: return 2; } }',
    },
  ],
  invalid: [
    {
      name: 'two switches on the same cases',
      code: `
        function postage(parcel) {
          switch (parcel.kind) {
            case 'letter': return 1;
            case 'crate': return 9;
          }
        }
        function label(parcel) {
          switch (parcel.kind) {
            case 'letter': return 'L';
            case 'crate': return 'C';
          }
        }
      `,
      errors: [
        {
          messageId: 'found',
          line: 3,
          data: { count: 2, cases: "'crate', 'letter'" },
        },
        {
          messageId: 'found',
          line: 9,
          data: { count: 2, cases: "'crate', 'letter'" },
        },
      ],
    },
    {
      name: 'the same cases in another order',
      code: `
        function postage(parcel) { switch (parcel.kind) { case 'letter': return 1; case 'crate': return 9; } }
        function label(parcel) { switch (parcel.kind) { case 'crate': return 'C'; case 'letter': return 'L'; } }
      `,
      errors: [
        {
          messageId: 'found',
          line: 2,
          data: { count: 2, cases: "'crate', 'letter'" },
        },
        {
          messageId: 'found',
          line: 3,
          data: { count: 2, cases: "'crate', 'letter'" },
        },
      ],
    },
  ],
});
