import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RunTests } from '@typescript-eslint/rule-tester';
import type { SelectorMessageId } from '../define-selector-rule.ts';
import { testRule } from '../testing/rule-testers.ts';
import { selectorRules, type SelectorRuleName } from './selector-rules.ts';

// Valid cases hold the false positives the measurements recorded and the sharpened selector avoids; invalid cases are
// true positives of the same shape, written for these tests.
const selectorCases = {
  'switch-on-kind': {
    valid: [
      "switch (order.status) { case 'open': break; }",
      "switch (kind) { case 'letter': break; }",
    ],
    invalid: [
      {
        code: `
          function postage(parcel) {
            switch (parcel.kind) {
              case 'letter':
                return 1.5 + parcel.grams * 0.01;
              case 'crate':
                return parcel.kilos * 4 + parcel.floors * 12;
            }
          }
        `,
        errors: [{ messageId: 'found' }],
      },
    ],
  },
} satisfies Record<SelectorRuleName, RunTests<SelectorMessageId, []>>;

Object.entries(selectorCases).forEach(([name, cases]) => {
  const rule = selectorRules.find((candidate) => candidate.name === name);

  if (rule === undefined) {
    test(name, () => {
      assert.fail(`no selector row is named ${name}`);
    });

    return;
  }

  testRule(rule, cases);
});
