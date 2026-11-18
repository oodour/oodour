# @layzee/eslint-plugin-oop

Lars, 2026-11-18: "Based on the audits, create a `@layzee/eslint-plugin-oop` packages that groups existing lint
rules and adds custom lint rules in preset(s). It should also disable conflicting lint rules if possible." "Use
/lars-mode and /poteto-mode, their relevant playbooks and principles as well as the pstack and lz-tdd plugins and
finally the lz-oop plugin itself to build this package. Keep .scratch/*.plan.md and/or .scratch/*.todo.md files as
needed." "Pattern engines outside ESLint are out-of-scope for now." Then: "Following that, create `lz-oop` Fallow
preset(s)."

Input: `plans/lz-oop-research/lint-rules-audit-2026-11-18.md` (merged audit) and the slice files it names.

Lars, 2026-11-18, later: "Each custom or configured lint rule should include RuleTester tests (ESLint or
typescript-eslint) and a code fixer if possible. Alternatively, a custom codemod, for example using jscodeshift or
ts-morph, referenced in its error message."

Claude's reading: "configured" covers every existing rule a preset sets with options, `no-restricted-syntax` selectors
included. Each gets RuleTester cases that pin the configuration. The order of preference is: an autofix where the change is
safe and local; else an ESLint suggestion where a person must confirm; else a codemod named in the message. A
cross-file cure (Move Function, Extract Class) is codemod territory. Where none is possible, the message says why,
and the rule's docs record it.

Lars, 2026-11-18: "The strict preset rules should also be set to error severity." So all presets use `error`.
Each conflict rule is `off`.

Suffix for typed presets: `-type-checked` (typescript-eslint, kebab keys) or `TypeChecked` (NgRx 22.0.1, camelCase
keys `allTypeChecked`, `effectsTypeChecked`, `signalsTypeChecked`). Both were read from source. angular-eslint 22.7.0 has no typed presets; its typed rules
are only in `tsAll`.

Lars, 2026-11-18: "Use typescript-eslint's naming, kebab-case keys with the -type-checked suffix plus camelCase
aliases". The presets are therefore `recommended`, `recommended-type-checked`, `strict` and `strict-type-checked`,
plus the aliases `recommendedTypeChecked` and `strictTypeChecked`, all at `error`.

Lars, 2026-11-18, "1: OK" to the recommendation: each `no-restricted-syntax` selector becomes its own rule, tiered
by its measured false-positive rate on the three audited repositories (lz-gardener, lz-node-test,
stryker-playwright-runner, run on scratch clones), and dropped if too noisy for `strict`.

## Assumptions (Claude's, stated, reversible)

- Location: a new Nx project `eslint-plugin-oop` at `packages/eslint-plugin-oop/` in this workspace, package name
  `@layzee/eslint-plugin-oop`, version 0.0.0, `private: true` until Lars rules on publishing (a human-only gate).
- Source is erasable TypeScript run by Node.js directly, tests are `node:test` with typescript-eslint's
  `RuleTester`, matching the `tooling` project. No build step yet: a published package needs JS in `dist/`, priced
  below and deferred to the publishing decision.
- Flat config only (ESLint 9+; the workspace runs 10).

## Public surface (restate at every report until it lands)

- `plugin.rules`: custom rules under the `oop/` prefix.
- `plugin.configs.recommended`: existing core and typescript-eslint rules the audit mapped to lz-oop concepts, as
  `warn` (cues to look, not gates), plus the custom rules that need no type information, plus the core and
  typescript-eslint rules that work against the plugin turned off.
- `plugin.configs['recommended-type-checked']`: the above plus type-aware rules (custom and typescript-eslint).
- Third-party conflicts (unicorn, sonarjs, functional) can sit in the presets themselves: ESLint 10 skips validation
  of a rule set to "off" before it looks up the plugin (`lib/config/config.js:718` at v10.13.0, measured by `how` and
  re-read by Claude), so an unregistered namespace costs nothing. A misspelled "off" ID is silently ignored, so a
  drift test checks every ID against the installed plugin.
- Names of presets and rules are public vocabulary: Claude picks them now, Lars may rename before publishing.

## Waves

1. Scaffold + presets of existing rules + conflict-off configs, with drift tests (each named rule exists in the
   installed package version; each off-config's plugin really has that rule).
2. Custom rules, small: `middle-man`, `inheritance-depth`, `options-object-keys`, `no-new-collaborator`.
3. Custom rules, medium, hit by the audits: `query-and-command`, `flag-argument`, `type-hopping-chain` (spike exists).
4. Custom rules, rest: `repeated-absence-check`, `temporary-field`, `refused-bequest`, `feature-envy`.
5. README (oracle-gated: JS/TS choices on a Metz entry), dogfood on one audited repo read-only, review round.
6. Fallow presets for lz-oop (Lars's follow-up): config file(s) for `fallow` thresholds matching the plugin's size
   rules; spike Fallow on lz-gardener first (approved: "Spike Fallow on lz-gardener: OK").

Each rule: lz-tdd cycles (red, tpp, refactor), cycle log in the scratchpad, rule message and docs in Claude's own
words, `source-overlap` on prose, oracle-reviewer gate on the README.

## Deferred, with price

- Build to `dist/` and publish: ~1 hour (tsc emit config, `exports`, files list); needed only when Lars approves
  publishing. Until then consumers load it by path through jiti (ESLint's TS config loader).
- Program-wide checks (Data Clumps across files, Repeated Switches across files): not ESLint rules; Fallow or a
  script.
