import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listExistingRules } from './existing-rules.ts';
import { installedRule } from './testing/installed-rules.ts';
import { testConfiguredRules } from './testing/rule-testers.ts';

// Drift: every rule the catalog names exists in the installed package and is not deprecated there.
// One test per rule, so the report names the rule and the package version it is missing from.
for (const existingRule of listExistingRules()) {
  test(`${existingRule.id} exists in the installed ${existingRule.source.package}`, () => {
    const installed = installedRule(existingRule.id);

    assert.equal(installed.deprecated, false, `${existingRule.id} is deprecated in ${installed.installedFrom}`);
  });
}

// Pins: RuleTester cases for every cue the catalog configures with options. The parameter's key type is derived
// from the catalog, so this call does not type-check while a configured cue has no cases, or while a cue the
// catalog dropped still has some. The cases carry no options: the catalog's are added to each of them.
testConfiguredRules({
  'max-params': {
    valid: [{ code: 'function place(a, b, c, d) {}' }],
    invalid: [{ code: 'function place(a, b, c, d, e) {}', errors: [{ messageId: 'exceed' }] }],
  },
  'max-lines-per-function': { valid: [], invalid: [] }, // TODO: a 5-line body passes, a 6-line body reports
  complexity: { valid: [], invalid: [] }, // TODO
  'no-param-reassign': { valid: [], invalid: [] }, // TODO: assigning to a parameter's property reports
  '@typescript-eslint/switch-exhaustiveness-check': {
    valid: [],
    // TODO: a `default` over a union with a missing member still reports. The error lists `suggestions`, because
    // the installed rule offers one and RuleTester then requires it: an upstream suggestion is pinned too.
    invalid: [],
  },
  '@typescript-eslint/method-signature-style': {
    valid: [{ code: 'interface Role { play: (note: string) => void }' }],
    invalid: [
      {
        code: 'interface Role { play(note: string): void }',
        // The installed rule fixes, so RuleTester requires `output`: an upstream fixer is pinned too.
        output: 'interface Role { play: (note: string) => void }',
        errors: [{ messageId: 'errorMethod' }],
      },
    ],
  },
});
