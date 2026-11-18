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

Lars, 2026-11-18: "Borrowed rules can't name our codemods: OK". A borrowed rule's codemod is named in the README
table generated from the catalog, not in its message.

Lars, 2026-11-18: "Wrapper rule: OK" to Claude's recommendation. `@layzee/oop/class-methods-use-this` wraps
typescript-eslint's rule. It defaults to `ignoreOverrideMethods: true` and `ignoreClassesWithImplements: 'all'`, uses
our own message (move the method to the object whose data it uses, or make it a module function for a pure
calculation; keep `static` for methods that only build an instance), is in the `strict` tier, and has remedy `none`
until a Move Function codemod exists. The core and typescript-eslint versions stay `off`. It is wave 1b work.
Spike the context-forwarding wrapper first; if it fails, reimplement the check.

Lars, 2026-11-18 morning, on the morning brief: "Delete node_modules in the finished worktrees: OK". "The docs URL:
Link to the GitHub repo's `#readme` anchor (if that still works)." "All exported symbols should be prefixed with
`LzOop`, `lzOop`, or `lz-oop-`." He asked to be interviewed about each open Fallow preset call, whether the wave 1b
limits are in line with lz-oop and the oracle and what a better developer experience would be, and what
`configs.conflicts`, the codemod command naming conventions and the `remedy` field are, and why `OopPlugin` hides
`rules`.

Lars, 2026-11-18 09:4x local, on Claude's recommendations:

- Prefix: "How far does the LzOop prefix reach: OK". So: `OopPlugin` becomes `LzOopPlugin`, config names `oop/...`
  become `lz-oop/...`, the package becomes `@layzee/eslint-plugin-lz-oop` with rule namespace `@layzee/lz-oop`, the
  codemod bin is `lz-oop-codemod`, and internal module exports keep their names.
- Docs URL: "The GitHub repository root's readme anchor, but at the time this is published, the repo will be
  transferred from `LayZeeDK-Premium/lz-oop` to `LayZeeDK/lz-oop`." and "The anchor is `#readme-ov-file` which
  redirects to `?tab=readme-ov-file`." So: `https://github.com/LayZeeDK/lz-oop#readme-ov-file`.
- Severity: "Times are changing. This is a pluign built for AI coding agents who work at a rate much faster than
  humans. We keep the error severity instead of warn because it forces the AI coding agent to make a decision: Apply a
  fix or disable the rule with a reason."
- Parameters: "We set it to 3 then." One `max-params`: "OK" (typescript-eslint's; core's off).
- Class size: "We should find/configure an existing or create a custom rule. It should exclude blank lines,
  whitespace, and comments."
- Sixth rule: "For an AI coding agent, this translates to disabling a rule with a reason, ideally following explicit
  human approval, prompted guidelines, or subagent review (ideally an out-of-family model or at least a different,
  intelligent model). Also what you recommended" (`require-description` on disable comments).
- Limits kept: "My default is everything we discussed so far, not only "her three numbers"." So `complexity`,
  `max-depth`, `max-statements` and `cognitive-complexity` stay.
- Messages: "Say "stop and look" in the messages: Yes. As discussed above, the intention is to support the
  fast-moving pace of AI coding agents but to force them to make an intentional decision."
- Codemods: "Codemod command naming: OK"; "A separate package, so lint users don't install ts-morph: OK".
- `OopPlugin` hides `rules`: "Try 1st-party `@nx/*:*` generators for generating lint rules/plugins/packages. Analyze
  Nx' 1st-party lint rules' approach in the `nrwl/nx` repo."
- Fallow: thresholds "Start with lz-node-test and stryker-playwright-runner, then re-evaluate whether to move on to
  real-world OSS repos." Severities: "Error severity, not warn." `--coverage`: "OK" (the README shows
  `fallow health --coverage`). Open: package name precedent, and what a two-preset split would be.
- Worktrees: "Approve merged worktree deletion."
- Fallow name: "`@layzee/fallow-config-lz-oop`: OK". Count: "Only one preset, at least until the measurement is in."
- Class size rule: "@layzee/lz-oop/max-class-lines: Include options skipBlankLines, skipComments, and similar from
  `max-lines` with same defaults as `max-lines` unless oracle/lz-oop suggest other defaults."
- Borrowed size rules: "Stop and look: Add wrappers to pass our messages." So each borrowed size rule gets an
  `@layzee/lz-oop/` wrapper with our message, and the upstream version is off.
- Fallow, after the measurement on lz-node-test and stryker-playwright-runner: "complexity-crap: OK" (stays `error`;
  README says run `fallow health --coverage`; measure CRAP once with real coverage), "changeCoupling.minDegree: OK"
  (0.4), "Real-world OSS next: OK" (tldraw and ts-morph).
- "Named lzOopRules export with the LzOopRuleModule and LzOopRuleDocs types: OK". "Delete the agent's scratch
  workspace: OK".
- On `max-class-lines`, Lars asked: "Shouldn't the default `max` value for `max-class-lines` be `100` as per
  lz-oop/oracle? Is that with our without skipping comments or blank lines? Which defaults align with Metz?"
- "Measure the Ruby and JavaScript line counts through the oracle-curator and the oracle: OK" (the book's companion
  code in both languages, JavaScript formatted by Prettier, counts only). After the classifier refused the curator's
  copy-and-format step, Lars: "I approve the curator action" (copy the JS file into `.oracle/_linecount-tmp/js/`, run
  Prettier on the copy, count, delete the temporary folder).
- "max-class-lines defaults: OK but with `max: 110` to match the ~1.10 factor between Ruby and
  JavaScript/TypeScript classes". So `@layzee/lz-oop/max-class-lines` defaults to `max: 110`, `skipBlankLines: true`,
  `skipComments: true`, counting the whole class from its `class` line to its closing brace (measured: the book's JS
  classes are 1.06 to 1.09 times their Ruby, physical and code lines).
- Lars asked to "Include the Gilded Rose JavaScript kata used by the lz-tdd repo as a real-world repo for verifying
  the `lz-audit` skill followed by the `lz-oop` skill to gather plugin feedback."
- Fallow, after the file-length measurement on five repositories: "maxFileLines: 250, with complexity-file-lines at
  error: OK" and "Test files and the file-length rule: OK" (test files left out of the file-length check through a
  threshold override).
- Fallow: "I would include `complexity-file-lines` with a set `maxFileLines`" (value from a file-length measurement
  on the four repositories; neither Metz nor lz-oop names a file limit).
- Lars: "The "stop and look" lint rule messsages should mention which smell/anti-pattern/what to look for, and their
  cure, not just "Stop and look"."
- On Claude's reading of the 100-line screen for agents (a class should fit the screen of the person who approves
  it), Lars: "Agreed, code should still be human-readable, whether authored and/or reviewed by agents. Good software
  engineering practices lead to good code at good quality and maintainability, whether human- or agent-authored."
  So the limits keep their human-reader rationale; the README states it.
- (Message ruling, continued.) So every wrapper and custom-rule message names the smell or anti-pattern, what to
  look for, and the cure (the refactoring and, where one exists, the codemod or fix).

## AFK contract, 2026-11-18 night

Lars, 2026-11-18: "You are running in AFK mode overnight with a 3 agent cap and Fable 5.2 credits".

- **Goal, in priority order** (falls back in this order when goals pull apart):
  1. `@layzee/eslint-plugin-oop` per `.scratch/eslint-plugin-oop/design.md`, waves 1a, 1b, 2 to 5.
  2. lz-oop Fallow preset(s) (Lars: "Following that, create `lz-oop` Fallow preset(s).").
  3. lz-gardener full-cure round on `refactor/oop-audit`:
     - the finding 3 tests and commit, then findings 5, 1, 4 and 6;
     - each finding goes through a slim plugin session, then checks, commit, thermos review, fixes, and plugin
       feedback.

     Heavy test parts only in heavy-lock slots.
- **Finish condition (checkable):**
  - `npm exec -- nx run-many -t typecheck lint test -p eslint-plugin-oop` exits 0 on `main`.
  - Every rule in the audit's Tier 2 list, the catalog's cues and conflicts, and every kept selector are in the
    package.
  - Each rule has RuleTester tests and a fix, suggestion or codemod, or `none` with a reason.
  - One review round is done, with findings resolved or recorded.
  - StrykerJS at 100% on the package or reasoned disables (lars-mutation-testing), under the heavy lock.
  - Then the Fallow preset file(s) with a test.

  The gardener round is done when each remaining finding is committed and reviewed. Stop after 3 waves without
  progress on one goal.
- **Gates that still hold:** no push, PR, issue or publish. Plugin-run sessions only for audited-repository code. The
  oracle firewall. Heavy runs only in lock slots. No eval round without Lars's go-ahead. No hook or mod.
- **Cap:** at most 3 subagents at once. Fable is allowed for the hard parts: codemods, design questions, a stuck
  approach.
- **Escape hatch:** if truly stuck, stop and write up why here.
- **Decision log:** `.scratch/eslint-plugin-oop.decisions.tsv`. Rows are stamped with `date -u` at write time and
  are Claude's calls, not Lars's.

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
