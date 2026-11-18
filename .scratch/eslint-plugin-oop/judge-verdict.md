# Verdict: candidate-a vs candidate-b

Read end to end: both `design.md` files and every sketch file. Nothing was run. File and line refs are to the sketch
files under each candidate folder. Rulings applied: RuleTester plus fixer or codemod per custom/configured rule;
`recommended` and `strict` tiers, each with a type-checked variant, all at `error`; conflicts `off`.

## Scores

| # | Criterion | A | B |
| --- | --- | --- | --- |
| 1 | One source of truth | 4 | 5 |
| 2 | Conflict handling | 4 | 5 |
| 3 | Tiering fit | 3 | 4 |
| 4 | Cure order in types | 4 | 4 |
| 5 | Test harness | 4 | 4 |
| 6 | Risk | 3 | 3 |

### 1. One source of truth
- A 4: `ruleCatalog` (`src/rule-catalog.ts:44`) plus `ownRules` (`src/rules/own-rules.ts:11`) feed presets and drift tests,
  and fixable/hasSuggestions derive from `Cure` (`define-oop-rule.ts:57-61`). But `typed` is a hand-set field on every
  catalog row (`rule-catalog.ts:18`), so "needs type information" is written twice (row and installed rule) and nothing
  compares them. Nothing checks that an own rule has a test file.
- B 5: `typed` is read from the installed rule's `meta.docs.requiresTypeChecking` (`src/presets.ts:52-56`, `existing-rules.ts:10`),
  so there is no field to keep in step. `rules/index.test.ts:6` fails on an unregistered, misnamed or untested rule file
  (`testing/registered-modules.ts:3-9`). Adding an own rule is three touches (module, test, index line); a selector
  rule costs a whole file, heavier than A's row.

### 2. Conflict handling
- A 4: one named `off` entry per namespace, no `plugins` key (`presets.ts:27-28`), drift test via `installedRuleModule`
  (`rule-catalog.drift.test.ts:12-22`). The namespace switch in `installed-rules.ts:13` is not compile-forced to cover a new
  namespace. No conflicts-only config.
- B 5: all conflicts in one `oop/conflicts` layer, also exported alone (`presets.ts:17-24`, `existing-rules.ts:37-43`
  explains why off needs no plugin). `InstalledRuleMaps = Record<SourceId, ...>` (`testing/installed-rules.ts:21`) makes a
  new source without a loader fail to compile; the throw names package and version (`installed-rules.ts:35-37`).
- Both are silent when a consumer registers a third-party plugin under another key.

### 3. Tiering fit
- A 3: no tier field anywhere. A row has hand-set `typed`, and third-party cue rows cannot be typed
  (`rule-catalog.ts:26-27`), so the typed split cannot reach `unicorn`/`sonarjs`/`functional`. "Always `warn`" is prose
  (`rule-catalog.ts:6`, `presets.ts:21-30`) with no test; the `error` ruling is a one-spot edit plus a new assertion.
- B 4: the typed split is derived (`presets.ts:52-56`), layers are named and composable (`presets.ts:63-66`), and one
  `cueSeverity` constant is the only place severity is chosen (`presets.ts:52`). A `tier` field on `Cue` and on own-rule
  docs is a small addition. Costs: `presets.test.ts:22-25` ("only ever warn or turn off") must flip, and "every rule in
  the registry is in a preset" (design.md, Tradeoffs) breaks once `strict` exists. Companion configs also have no typed
  split.

### 4. Cure order in types
- A 4: `Cure` union with `CodemodName = keyof typeof codemods` (`define-oop-rule.ts:13-17`, `codemod-registry.ts:13-17`);
  a selector row's cure is derived from which field it has (`define-selector-rule.ts:24-30`), so it cannot claim a cure it
  lacks. Catalog rows carry a cure for borrowed rules too (`rule-catalog.ts:23`), though several are `'TODO'`. The
  `suggestion` and `fix` kinds need no reason.
- B 4: `Remedy` union with `because` required on every kind after `fix` (`create-rule.ts:14-18`), `CodemodName` keyed to
  the registry (`create-rule.ts:3`), and `fixable`/`hasSuggestions` cannot be written (`create-rule.ts:37-45`). Borrowed
  rules carry no cure record (open question 3 defers to a README pointer). The message says `<file>:<line>` literally
  (`create-rule.ts:56`), less useful than A's filled placeholders.
- Neither makes "fix before suggestion before codemod" machine-checked beyond one declared kind per rule.

### 5. Test harness
- A 4: `runOopRuleTests` asserts the cure contract (`fix` needs `output`, `suggestion` needs `suggestions`, `codemod` needs
  `curedBy`) (`testing/rule-testers.ts:22-29`); `configuredCases satisfies Record<ConfiguredRuleId, ...>`
  (`configured-rules.test.ts:42`) and `selectorCases satisfies Record<SelectorRuleName, ...>` (`selector-cues.test.ts:36`)
  are compile failures. The typed fixture includes `react.tsx` and a tsconfig. Costs: a `--import` preload on the `test`
  command (`project.json:23`), so a single-file run needs the flag; own-rule test existence is unchecked.
- B 4: importing `testing/rule-testers.ts` wires `node:test`, no preload (`rule-testers.ts:1-4`);
  `Record<ConfiguredRuleId, ...>` pins (`rule-testers.ts:55`); `testRule` picks typed or untyped from the rule's own flag
  (`rule-testers.ts:27-29`); strict typed fixture (`tests/typed-fixture/tsconfig.json`). The cure obligation rests on
  RuleTester failing a fixing rule without `output`, marked [I] (design.md "remedy" table).
- Both: tests are required for configured rules by type, for own rules only by convention or file-existence.

### 6. Risk
- A 3: rests on RuleTester rejecting an unsubstituted `{{codemodFile}}` placeholder (design.md, `codemodHint`,
  marked [I]); `FlatConfig.Plugin` typing for getters; consumer `defineConfig` accepting `TSESLint.FlatConfig.Config`
  arrays (unflagged); root ignore of `packages/**` relies on ESLint 10 config lookup (open question 7, [I]); and the
  base config sets `languageOptions.parser` with no `files` (`presets.ts:22-24`), which would hand `.html` or `.vue` files
  to the TypeScript parser. If the placeholder claim is false the message design falls back to literal text (cheap); the
  parser setting is a real defect.
- B 3: first risk is `Linter.Config` accepting `plugins: { ns: plugin }` built from `RuleCreator` rules (design.md "Risks",
  first bullet) and `defineConfig` accepting it. It touches `presets.ts`, `index.ts` and the public types, but the
  fallback (own wide structural types) is named and contained. Also unverified: RuleTester statics, `nx:run-commands`
  cwd (paths in `project.json:8,28,31` assume root), and the peer on `@typescript-eslint/eslint-plugin`.

## Recommendation

Base: **candidate B.** It wins on derivation (typed flag, folder-vs-registry check), compile-forced conflict coverage,
a standalone `conflicts` config, no parser in the preset, and one root lint bar. Its biggest unknown is contained.

Grafts from A (at most three):
1. **`defineSelectorRule` and the selector-row table keyed by a derived `SelectorRuleName`** (`define-selector-rule.ts`,
   `selector-cues.ts:48-51`, `selector-cues.test.ts:36`). B makes each of the audit's ~30 selectors a full file with its
   own registry line; A makes it a row, derives the cure from the row's fields, and fails typecheck when a row has no
   cases.
2. **A `cure` on borrowed catalog rows** (`rule-catalog.ts:19-23`), using B's `Remedy` with `because`. Lars's ruling
   covers configured rules, and B records nothing about what an upstream rule offers or which codemod the docs should
   name; this also feeds the README table B already derives.
3. **`runOopRuleTests`' cure-contract assertion** (`testing/rule-testers.ts:22-29`, including `curedBy`). It makes the
   fixer and codemod test obligation explicit instead of relying on unverified RuleTester behaviour, and its
   `codemodTarget` data (`define-oop-rule.ts:85-93`) is a stronger message than `<file>:<line>`.

Do not take from A: the global `languageOptions.parser` in the base config, the `--import` preload, per-namespace
conflict entries without a standalone config, or the hand-set `typed` field.

Changes needed in B for the rulings: add a `tier` to `Cue` and to own-rule docs, build `recommended`/`strict` and their
type-checked layers from it, set `cueSeverity` to `'error'` and rewrite the warn-or-off test as "cues are error,
conflicts are off".

DONE judge
