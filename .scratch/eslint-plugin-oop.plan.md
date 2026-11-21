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
- Fallow README: "I recommend the Fallow README shows two runs: OK" (`fallow health --coverage --changed-since <base>`
  as the gate, `fallow health --hotspots` as the report of where to refactor).
- Sync: "Unelss ESLint and Fallows complexity are calculated with wide differences, they should be synced. The same
  goes for sonarjs and Fallow cognitive complexity. If unsynced, it should be to account for the differences by a fixed
  factor or similar." (Measured defaults: ESLint `complexity` 20, classic variant; Fallow `maxCyclomatic` 20; sonarjs
  `cognitive-complexity` 15; Fallow `maxCognitive` 15.)
- Lars, on the complexity question: "All Metz/Owen content in the oracle store should be covered, not only books and
  talks" (99-bottles-2e-js, metz-talks, metz-written, poodr-2e, owen-talks, 99bottles-js, 99bottles-ruby).
- Lars: "Moving forward, keep your 3-agent cap".
- Lars, 2026-11-18, on the level after the sync measurement and the oracles: "Complexity level, with ESLint and Fallow
  synced to the same numbers: Approve the "4/5" option." So ESLint `complexity` 4 = Fallow `maxCyclomatic` 4, and
  cognitive 5 (sonarjs, wrapped) = Fallow `maxCognitive` 5. Basis: no Metz or Owen source sets a number; the book's JS
  companion code never exceeds 4 cyclomatic or 2 cognitive at any chapter end (curator measurement); the same number
  gives the best overlap between the tools (90.5% cyclomatic, 84.6% cognitive on four repositories).
- Lars, 2026-11-18: "Measure the Ruby companion code with lizard: OK." (the curator runs `uv tool run lizard` over the
  store's stage exports, read-only, names and numbers only). Then: "Also run RuboCop and Flog for completeness' sake"
  (in a Docker `ruby` image, in a lock slot, store mounted read-only). And: "Shut down Docker and WSL when unused by
  you and other containers".
- Lars, 2026-11-18, after the cognitive-alone measurement: "Let's set cognitive complexity to 4." (ESLint
  `cognitive-complexity` and Fallow `maxCognitive` both 4; cyclomatic stays 4.)
- Lars, 2026-11-18, on keeping Fallow's complexity gates on in the preset (Claude's recommendation: keep them at
  `error`, and tell consumers who also run the ESLint plugin how to turn them off): "1: Agreed. Fallow's complexity
  checks seem slightly beneficial over ESLint's, especially to template-based frontend frameworks like Angular. At
  the same time, we don't want to force Fallow onto lz-oop consumers so we need to support both ESLint and Fallow as
  well as either/or."
- Lars, 2026-11-18, on Angular template complexity: "Unless angular-eslint and other Angular ESLint plugins have other
  rules related to lz-oop/the oracle store, just cover the angular-eslint complexity rules in lz-oop's README or docs.
  If there *are* additional related *existing* Angular-specific rules, we should create an additional lz-oop ESLint
  plugin package for Angular."
  Survey result, 2026-11-18 (scratchpad `eslint-plugin-oop/angular-rules-survey.md`, Claude's stances, no rule run):
  angular-eslint 22.8.0 has 15 related rules beyond the two complexity rules (cues and conflicts), @ngrx/eslint-plugin
  22.0.1 has 16, codelyzer 6.0.1 adds none not ported to angular-eslint. The condition holds, so the package
  `@layzee/eslint-plugin-lz-oop-angular` is due. Open for Lars: NgRx as an `ngrx` config with an optional peer
  dependency in that package (Claude's recommendation) or a separate package.
- Lars, 2026-11-18, on a `switch` factory over four or more kinds passing the cyclomatic limit of 4 (Claude's
  recommendation: keep the limit, the factory states its exception): "Switch factories under the cyclomatic limit of 4:
  OK".
- Lars, 2026-11-18, on codelyzer's `templates-use-public`: "The latest version of Angular supports templates reading
  `public`, `protected`, or even `private` members (but not `#private` members). I prefer `protected` since it is a
  clear indication of a template-only component member, given that component inheritance is rare and generally
  discouraged with directive composition being the more modern, Angular-native alternative, although I covered Angular
  inheritance in my Angular Ivy book."
- Lars, 2026-11-18, on where NgRx stances go: "How directly related are they to lz-oop/oracle? This goes for all
  rules/concepts discussed. *If* we add NgRx rules, I agree with your recommendation." (the recommendation: an `ngrx`
  config in `@layzee/eslint-plugin-lz-oop-angular` with `@ngrx/eslint-plugin` as an optional peer dependency).
- Lars, 2026-11-18, on the interview: "foreign-knowledge rule: OK."; "Replacement for template/no-call-expression:
  OK."; "NgRx: OK. No NgRx config."; "Rules mapped from Fallow: We should only decide on Fallow features that relate to
  lz-oop/oracle."; "Use `protected` for template-read components members. Use `#private` for other component
  internals, including `inject()`ed dependencies. If `private-modifier` suggests turning TypeScript `private` into
  `#private`, that's compliant with using `protected` for template-read members." (Claude's note: the rule is named
  `ts-private`; its `inject()` exemption, the X-ts-private-not-di form in design.md, contradicts this ruling.)
- Lars, 2026-11-18, on ESLint, Fallow or both: "Our README or docs just need to cover turning either one off when both
  are used. We don't have to have additional presets for this. Some may prefer keeping both fully enabled."
- Lars, 2026-11-18, on the ABC and Halstead prior art: "The ABC and Halstead measurement: OK" (Claude's
  recommendation: one throwaway measurement of ABC, counted as eslint-plugin-abcsize does plus loops, and Halstead
  volume, counted per function from tokens as eslint-plugin-code-metrics does, over the four repositories and the
  companion code; a rule only for a metric that flags functions the size and complexity rules miss).
- Lars, 2026-11-18, on lz-gardener-19's relay of his words "Then guide the lz-oop session in setting up similar rules
  and skill usage for its repo." (GLOSSARY.md, docs/adr, a words-and-decisions section in AGENTS.md): "When to set up
  the glossary, ADRs and AGENTS.md rules lz-gardener-19 relayed: Now."
- Lars, 2026-11-18: "Keep the 7-line limit" (`max-lines-per-function` 7 with blank lines and comments skipped; ESLint
  counts the signature line and the closing brace, so 7 allows 5 body lines, Metz's 5-line rule).
- Lars, 2026-11-18: "ABC rule: OK." (Claude's recommendation: measure first whether ABC flags functions the size and
  complexity rules miss, then build the rule only if it does.) On sources: "eslint-plugin-abcsize: ... It could be used
  as inspiration." and "typhonjs-escomplex: Hasn't been updated in 8 years but could serve as inspiration."
- Lars, 2026-11-18, after the ABC and Halstead measurement: "An ABC rule: Approve recommendation." The recommendation
  he approved: build an ABC rule in the recommended tier, alongside all the size rules, not instead of them, at a limit
  of 15 or 17 (2.8% or 2.0% of functions; nothing new while the strict size rules are on); no Halstead rule. Claude's
  decision on the open number, 2026-11-18: 15, the default of eslint-plugin-abcsize's code and `recommended` config, the
  only ESLint ABC rule found (RuboCop's 17 is the alternative); reversible as a default option.
- Lars, 2026-11-18, on the eight open items: "Middle Man, same-value parameter, and Data Clumps within a module: OK"
  (measure false positives first, then decide each); "Temporaries: OK" (wrap sonarjs `prefer-immediate-return`, cure
  Inline Temp, after counting its findings); "foreign-knowledge and positional arguments: OK" (count positional
  arguments only for receivers the code does not own); "A template rule for deep data paths: OK" (deferred); "A
  thin-component rule: OK" (none). On `no-super-lifecycle-call`: "Let's discard NgRx-specific lint rules and presets.
  In fact, I think we shoul only include Angular rules -- whether existing or custom -- that have a direct correlation
  to lz-oop/oracle like the angular-eslint template complexity rules." Still open: the `ts-private` `inject()`
  exemption (he asked for the original reason) and `new-in-constructor` field initialisers (he asked for examples).
- Lars, 2026-11-18: "ts-private: remove the inject() exemption: OK"; "Angular rule list: OK" (keep the direct-tie
  rules, drop `no-empty-lifecycle-method`, `prefer-output-readonly`, template `no-any`, `require-switch-default`);
  "new-in-constructor: OK" (field initialisers, `values` option, measured first). "template prefer-at-else:
  `@if`+`@else` is additionally provenly better for performance than `@if`+`@if`." "no-global-document: We could
  configure a restricted globals ESLint rule to force Angular application to wrap all browser global objects in
  `InjectionToken`s or other DI symbols." "For Angular-specific custom lint rules, use angular-eslint's exported
  utilities." "Oracle should also look for Metz on ABC calculation in oracle sources other than books." On
  `no-super-lifecycle-call`: "I don't understand why components extending other components/directives shouldn't be
  allowed to call super.ngOnInit() to run its ancestor's initialization. When you say "hooks instead of super", I'm
  thinking that super.ngOnInit() *is* a hook so I don't see the issue." (open: Claude to explain)
- Lars, 2026-11-18: "ABC rule: Go ahead, calculate as recommended by Metz" (count A, B and C as *99 Bottles of OOP*
  does; the counting details come from the oracle, not from eslint-plugin-abcsize).
- Lars, 2026-11-18: "Delete the merged worktrees: Approve merged worktree deletion." (fallow-2, eslint-plugin-w,
  eslint-plugin-r).
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

## Rulings, 2026-11-19 (evening)

- Halstead and Flog get limit rules after all. Lars, 2026-11-19, on Claude's "no rule for either": "I still want
  limits. That issues or smells are detected by multiple checks is a good thing and it allows consumers to pick and
  choose between what they value measuring." Claude's defaults, pending Lars: `halstead-volume` per function at 1000
  (Verifysoft's band, the only per-function limit in use); a Flog-style score per function with Flog's depth
  multiplier and weights translated to JS/TS, limit 25 (Code Climate's flag line; Scruggs's bands put 21-40 at "might
  need refactoring"). Both in the recommended preset at `error`, as ADR 0001 requires of every rule, with a "Stop and
  look" message naming the smell and its cure.
- `flog-score` design (Claude's translation of Flog v4.9.4 to JS/TS; research web file section B). Per function,
  `hypot(A, B, C)` of weighted sums, each event worth its base weight times the multiplier where it sits (1.0 at the
  top). A: declarator with init, assignment, update. B: `if`, `?:`, `switch`, each `case`, `&&`/`||`/`??`, loops,
  `catch`, and a call that takes a callback (Flog's block call). C: calls and `new` (1; `eval` and `Function` 5,
  `.call`/`.apply`/`.bind` and computed calls 3 like `send`, `reduce` 2 like `inject`, `Reflect.*`,
  `Object.defineProperty(ies)`, `Object.setPrototypeOf` and `new Proxy` 2), binary operators (1, as Ruby operators are
  calls), and number literals other than 0 and -1 outside a `const` initializer (0.25). Multiplier: +0.1
  for the bodies of branches, loops and `catch`, both sides of a logical operator and a block of two or more
  statements; +0.2 for a call's receiver and arguments and a binary operator's operands; +0.3 for an optional
  receiver. A callback passed as an argument is scored into the enclosing function, its body at +0.1, as Flog scores
  a block in its method; any other nested function is scored on its own. Type-only syntax is left out. Limit 25.
- Lars, 2026-11-20, on Claude's recommendation of a type-aware `require-super-lifecycle-call` in the Angular preset
  (reports a lifecycle method that overrides a parent's implementation without calling `super.<method>()`; docs say
  it is the project's choice and name the hook alternative): "The super.ngOnInit() rule: OK".
- Lars, 2026-11-20, on Claude's browser-globals list (`no-restricted-globals` with `checkGlobalObject: true` plus one
  `no-restricted-syntax` selector for destructuring, over `window`, `self`, `document`, `location`, `history`,
  `navigator`, `screen`, `localStorage`, `sessionStorage`, `indexedDB`, `matchMedia`, `getComputedStyle`,
  `requestAnimationFrame`, `cancelAnimationFrame`, `alert`, `confirm`, `prompt`, `open`; message points to `DOCUMENT`
  or an app `InjectionToken`; Node.js-shared APIs left out): "The browser-globals list: OK. What would including time
  and clock APIs mean?"
- Lars, 2026-11-20, after Claude's explanation (no-argument `new Date()`, `Date.now()`, `performance.now()`, timers;
  cure an injected clock or scheduler): "Time and clock APIs: OK, separate opt-in rule."
- Lars, 2026-11-20, after the measurement that ABC 8 and Flog 13 match cyclomatic 4, and volume 750 matches ABC 15
  and Flog 25: "Halstead volume default: *Recommended* gets ABC 15/Flog 25 and Halstead 750. Strict gets ABC 10/Flog
  15 and Halstead 400." Done: rule docs carry `strictOptions`, the strict presets set them.
- lz-audit gets a fresh-context auditor agent. Lars, 2026-11-19: "The same applies to lz-audit. It might be called by
  a long-running sesssion who created most of or the entire codebase being audited." Built as `lz-oop:auditor`
  (5bf6cfb).

## Rulings, 2026-11-20 (night)

- Lars, on "1. Which field gives way for the smell names" (Claude recommended `concept` take the smell name each
  message uses, every message opening "Stop and look: <concept>,"): "That sounds good but are we talking about lint
  rules? Would it be possible for the lint rule messages to name both the smell/anti-pattern and the cure/ordained
  pattern?" (open: Claude to answer; yes, lint rules)
- Lars: "The lz-oop ESLint plugin should include a parameter rule that properly counts an *options* object parameter
  in line with lz-oop/oracle." (open: oracle first)
- Lars: "Shell commands mentioned in skills and agents: Consider .ts scripts instead so that they are proven and
  shell-agnostic. For example, the shell scripts look for `from '<package-or-module-name>'` but not
  `import('<package-or-module-name>')`."
- Lars: "All subagent and skill steps that can be done deterministically using a script instead of prose-only should
  be in a script/CLI. Consider an `lz-oop` CLI (package name: `@layzee/lz-oop-cli` or bundled with the plugin only),
  keeping in mind that Claude Code does support `package.json` in a distributed plugin so we may use npm
  dependencies."
- Lars, about 23:00 local: "At that point, you will be on a Team plan with Fable credits, you won't have to coordinate
  pausing to reduce token spend with other sessions, and your agent cap will be raised to 4."
- Lars, on the Stryker runner: "use lz-node-test as asked and ensure that you have read all its docs to optimize your
  setup for wall-clock time, parallelization, and memory pressure." Done: 53b6ec8, pinned worktree at
  `D:/tmp/lz-node-test-pin-aa3bc1b` (aa3bc1b) after "Approve D:/tmp/ access".
- Lars: "When the plugin is proven, dogfood it on this plugin's own CLI, scripts, ESLint, and Fallow artifacts."
- Lars, on Claude's proposal "Stop and look: <smell>, <what was found>. <what to look for>. Cure: <named cures>." with
  `concept` naming the smell and a registry test: "Naming the smell and the cure in lint messages: OK"
- Lars, on Claude's proposal to count only the signature (positional parameters plus destructured keys): "How the
  parameter rule counts: Detect options reads and destructuring in the body." Claude's reading: an object parameter
  also counts each distinct key the body reads from it (`options.a`, `const { a } = options`), in place of the one
  it counts for the object itself.
- Lars, 2026-11-20: "1: Option B" (max-params recommended at 4, strict 3).
- Lars, 2026-11-20: "Catalogue every rule's smell and cure, and enforce it: OK" (Claude's proposal: `docs.smells` and
  `docs.cures` lists that build the message, a registry test that each is an entry, with its cure, in the plugin's
  `references/smells.md`, and the missing entries added, gated by oracle-reviewer).
- Lars, 2026-11-20, on Claude's proposal to keep "Hidden Dependency" and "Repeated Absence Check" as the plugin's own
  names: "I would prefer that we don't invent concepts. lz-oop is based on oracle. Every concept, rule, or Fallow
  check it includes should have an origin in oracle (Sandi Metz, Katrina Owen, and other sources they reference)."
- Lars, 2026-11-20: "Spike for a bundled CLI install: OK".
- Lars: "Where the CLI lives: Bundle with plugin. Research prior art, @claude-code-guide, the plugin-dev and
  skill-creator plugins, and `~/.claude/research/` for guidance."
- Lars, 2026-11-21, on Claude's proposal to drop checks with no origin in the store: "Halstead volume: I still want to
  include it. It's clear that Sandi Metz use code metrics to inform her decisions. With autonomous, high-churn agents,
  this is even more important." "Cognitive complexity: Cyclomatic complexity is referenced multiple times from what I
  understand. Cognitive and cyclomatic are related. Keep both." "CRAP: Same decision and reaons as Halstead volume."
  Open: file length (Lars asks what the sources and Ruby and JS/TS practice say about several classes per file) and
  ts-private (Lars asks what "privacy as a signal, not something to enforce" means in practice).
- Lars, 2026-11-21: "Missing keynotes: OK" (fetch Grit and Practical Agile Development into metz-talks) and "The shared
  pin: OK" (angular-clean-architecture may read `D:/tmp/lz-node-test-pin-aa3bc1b`).
- Lars, 2026-11-21, on RuboCop excluding test files from `Style/OneClassPerFile`: "This is an important distinction for
  our ESLint presets and the lz-oop plugin overall. Have we analyzed which concepts and cures apply to
  application/library code vs. test code? What does the oracle say about this?" (open: oracles on POODR, 99 Bottles,
  Meszaros, then the talks)
- Lars, 2026-11-21: "File length: OK" (strict tier only, 250 lines, docs say Metz's unit is the class) and "Reek
  candidates: OK" (oracle check of Feature Envy, Data Clump, Control/Boolean Parameter, Repeated Conditional, Manual
  Dispatch before any rule).
- Lars, 2026-11-21: "Vimeo: The oracle curator may used my Vimeo-authenticated Chrome with /playwright-cli" (for the
  full Grit keynote).
- Lars, 2026-11-21, on ts-private: "Was `#` available in JS when the book was written? \"private\" methods overridden
  in subclasses map to TypeScript's `protected` (or `abstract`) methods and `override`." (open: Claude answered; the
  rule's fate waits on Lars)
- Lars, 2026-11-21: "Test-code treatment: Mainly configure file patterns so that rules that only apply to production
  code exclude test files. Test code-specific rules should only be adapted if an oracle origin is verified/traced."
- Lars, 2026-11-21: "Reek-derived rules: OK" (flag-argument and repeated-switches recommended, manual-dispatch,
  data-clumps and feature-envy strict, switch-on-kind to strict, Data Clumps and Feature Envy limits from probe runs)
  and "Full Grit keynote: OK" (stop at the highlights clip).
- Lars, 2026-11-21, on ts-private: "I would still prefer `#` when it doesn't conflict with oracle, seeing that it wasn't
  ratified and baseline/widely available when 99 Bottles was written and that it works for both TypeScript and
  JavaScript (has no other access modifiers). Of course, the lz-oop plugin should follow existing repo conventions for
  `private` vs. `#` since we don't have oracle support for runtime-private to support strongly recommending `#` over
  `private`. If the opposite is true (oracle suport for compile-time private rather than runtime private), we could
  reconsider."
