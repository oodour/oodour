# `@layzee/eslint-plugin-oop`: design sketch (candidate-b)

Sketch files are in `sketch/`, laid out as the package root `packages/eslint-plugin-oop/` would be. Marks:
**[M]** read in source at the tag or in the workspace file, **[I]** inferred or from memory, not read or run.
Nothing was executed.

## Problem

Lars asked for a package that groups existing lint rules, adds custom rules, ships them in presets, and turns off
rules that work against lz-oop. Later the same day: every custom or configured rule gets RuleTester tests and a
fixer if possible, or else a codemod named in its message. Four things make the shape non-obvious.

1. The package takes a position on rules it does not own (ESLint core, typescript-eslint, unicorn, sonarjs,
   functional). ESLint never checks a rule that is set to "off" [M, how.md section 2], so a misspelled or removed
   rule name does nothing and says nothing.
2. A rule turned on for a plugin the consumer has not registered throws, while one turned off is skipped [M]. The
   on-side and the off-side of an optional plugin cannot be offered the same way.
3. The same knowledge (which rule, why, with which options, typed or not, how to get from report to changed code)
   is wanted in the presets, the drift tests, the pinned RuleTester cases, the README, and the "guards" reference
   the audit recommends. Written by hand in each, that is five lists to keep in step.
4. An ESLint fixer can only edit the linted file, and most lz-oop cures touch other files (the audit: "No smell in
   the plugin has a safe autofix"). The order fix, suggestion, codemod has to be a property of each rule that the
   package checks, or it will be prose that rules forget.

Constraints honoured: erasable TypeScript run by Node.js directly, `node:test`, no build step, flat config only,
ESLint 10 and typescript-eslint 8, no `as` casts, cues at `warn`.

## Usage (caller's view)

### A consumer with typed linting, scoped to the domain code

```ts
// eslint.config.ts
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import oop from '@layzee/eslint-plugin-oop';

export default defineConfig(
  tseslint.configs.recommendedTypeChecked,
  { languageOptions: { parserOptions: { projectService: true } } },
  {
    files: ['src/domain/**/*.ts'],
    extends: [oop.configs['recommended-type-checked']],
  },
);
```

That one `extends` line registers the plugin, turns on the cues and the plugin's own rules at `warn`, and turns
off every rule that works against lz-oop, for `no-else-return` as much as for `unicorn/prefer-switch`, whether or
not unicorn is installed. The `files` scope applies to the offs as well, which is right: `no-else-return` stays
on outside the domain folder.

### A consumer without type information, who also uses unicorn

```ts
import unicorn from 'eslint-plugin-unicorn';
import oop from '@layzee/eslint-plugin-oop';

export default defineConfig(
  unicorn.configs.recommended,
  oop.configs.recommended, // after the other presets: later entries win
  oop.configs.unicorn, // extra cues from unicorn; add it only because unicorn is registered above
);
```

### A consumer who only wants their lint setup to stop fighting lz-oop

```ts
export default defineConfig(tseslint.configs.strict, unicorn.configs.recommended, oop.configs.conflicts);
```

### Disagreeing with the preset

```ts
export default defineConfig(oop.configs['recommended-type-checked'], {
  rules: {
    '@layzee/oop/type-hopping-chain': ['warn', { maxInterfaces: 3 }],
    'no-else-return': 'error', // the consumer's call; their entry comes last
    '@layzee/oop/middle-man': 'off',
  },
});
```

### From a report to changed code

```text
src/domain/invoice.ts
  12:10  warning  This chain steps through 4 different types; ask the nearest object for what you want.
                  Codemod: npx oop-codemod hide-delegate <file>:<line>          @layzee/oop/type-hopping-chain

$ npx oop-codemod hide-delegate src/domain/invoice.ts:12            # dry run: lists the files it would change
$ npx oop-codemod hide-delegate src/domain/invoice.ts:12 --write
```

A rule with a fixer changes code under `eslint --fix`. A rule with a suggestion offers it in the editor. A rule
with neither ends its message with `No automatic change: <why>`.

### A contributor adds a rule

Three touches, and the package refuses each way of forgetting one:

1. `src/rules/middle-man.ts`: `export const middleMan = createRule({ name: 'middle-man', meta: { docs: { concept,
   requiresTypeChecking, remedy, description }, ... }, create })`. `requiresTypeChecking` and `remedy` are required.
2. `src/rules/middle-man.test.ts`: `testRule(middleMan, { valid, invalid })`.
3. One line in `src/rules/index.ts`.

The rule is then in the right preset with no further edit. Leaving out step 2 or 3 fails `rules/index.test.ts`.

### A contributor adds or changes a stance on an existing rule

One line in `src/existing-rules.ts`:

```ts
'max-params': { cue: 'Long Parameter List', options: [{ max: 4 }] },
'no-else-return': { conflict: 'Its autofix removes the symmetric if/else that shows two equal alternatives.' },
```

A new cue with `options` stops `existing-rules.test.ts` from type-checking until it has pinned RuleTester cases.
A name the installed package does not have fails the drift test with the package version in the message.

Before publishing, a consumer loads the plugin by path: `import oop from '<path>/packages/eslint-plugin-oop/src/index.ts'`
(ESLint's TypeScript config loader, jiti, as the plan says).

## Shape

### Data structures first

Three registries hold everything. Every other artefact is derived from them or checked against them.

| Registry | File | Holds | Derived from it |
| --- | --- | --- | --- |
| Rule registry | `src/rules/index.ts` | the plugin's own rules, keyed by each rule's own `name` | `plugin.rules`, the own-rule half of every preset |
| Existing-rule catalog | `src/existing-rules.ts` | per source package: rule name -> `Cue` or `Conflict` | the cue and conflict half of every preset, the companion configs, the drift tests, the key type of the pinned cases, the README tables |
| Codemod registry | `src/codemods/index.ts` | codemods keyed by name | the `CodemodName` type a rule's remedy must use, the runner's `--list` |

The catalog is the decision the design depends on most:

```ts
type Stance = { cue: string; options?: readonly unknown[] } | { conflict: string };

interface RuleSource {
  package: string; // what the drift test loads
  namespace: string; // '' for core, '@typescript-eslint', 'unicorn', ...
  optional: boolean; // may the consumer lack it?
  rules: Record<string, Stance>;
}
```

- **One stance per rule, by structure.** The rule name is an object key. `class-methods-use-this` cannot be a cue
  and a conflict at once, which the audit's two lists currently say it is (open question 1).
- **No severity in the data.** `presets.ts` writes `warn` once for all cues and `off` for all conflicts, so no
  entry can make a cue a gate. A test asserts that no computed preset contains severity 2.
- **No typed flag in the data.** `presets.ts` reads `meta.docs.requiresTypeChecking` from the installed
  typescript-eslint rule [M: field exists, `packages/eslint-plugin/rules.d.ts`] and from the own rule's docs. Core
  rules never need types. Derived, per single-source-of-truth: nothing to keep in step.
- **The reason is data.** `cue` and `conflict` texts feed the README table and the guards reference, so the "why"
  is written once next to the rule name.
- **`optional` decides how each side is offered** (next section).

Access patterns traced through the structure: build a preset (one pass over `listExistingRules()` with a filter);
drift test (the same pass, one lookup each); pin test (keys of the cues with `options`, as a type); README (the
same pass, grouped by source). None needs an index or a second structure.

### The plugin object

`src/index.ts` [sketch is complete]: `{ meta: { name, version, namespace: '@layzee/oop' }, rules, configs }`.
`name` and `version` come from `package.json`. The presets must register this exact object, so it is created with
empty `configs` and filled in place with `Object.assign`, ESLint's documented pattern [M, how.md section 1], which
type-checks without a cast because `Object.assign` returns the intersection. Identity is kept, so a consumer who
also registers the default export by hand does not hit `Cannot redefine plugin` [M].

### The presets, and how they stay in step

`buildConfigs(plugin)` in `src/presets.ts` is a pure function of the rule registry and the catalog. It contains no
rule name. Layers are named flat config objects, so the config inspector shows where an entry came from:

| Config | Layers |
| --- | --- |
| `recommended` | `oop/plugins`, `oop/recommended`, `oop/conflicts` |
| `recommended-type-checked` | `oop/plugins`, `oop/recommended`, `oop/recommended-type-checked`, `oop/conflicts` |
| `conflicts` | `oop/conflicts` |
| `unicorn`, `sonarjs`, `functional` | `oop/<source>` |

- `oop/plugins` registers the plugin and the installed `@typescript-eslint` plugin (the same object
  `typescript-eslint` exports [M: `packages/typescript-eslint/src/index.ts` comment]). No parser, no
  `parserOptions`, no `files`.
- Every rule in the registry is in a preset. Which one follows from `requiresTypeChecking`. There is no
  `recommended` flag to forget.
- `presets.test.ts` runs each config through the installed ESLint (`calculateConfigForFile`), because ESLint is
  what resolves rule IDs and validates options against each rule's schema: a cue that does not exist, or whose
  options the installed rule rejects, fails there. It also lints a TypeScript snippet with `recommended` and no
  type information, which proves the typed split instead of asserting it.

### How the conflict-off sets are offered

By source kind, decided by what ESLint does, not by taste:

| Source | Its conflicts | Its cues |
| --- | --- | --- |
| ESLint core | in `oop/conflicts` | in the `recommended` layers |
| typescript-eslint (registered by the preset) | in `oop/conflicts` | in the `recommended` layers |
| unicorn, sonarjs, functional (optional) | in `oop/conflicts` too: ESLint skips an "off" entry before the plugin lookup [M], so this costs a consumer without the plugin nothing | in a companion config `oop.configs.<source>`, because an "on" entry throws unless the consumer registered the plugin |

So the consumer never has to remember a per-plugin conflict config: forgetting it would leave
`unicorn/no-static-only-class` autofixing classes away, silently. `conflicts` is also offered alone, the way
`eslint-config-prettier` stands alone and inside `eslint-plugin-prettier`'s recommended config [I]. All "off"
entries use the namespace consumers conventionally register (`unicorn`, `sonarjs`, `functional`).

### One custom rule module and the shared rule factory

`src/create-rule.ts` is the one way to define a rule. It wraps `ESLintUtils.RuleCreator<OopRuleDocs>` and takes
over what an author must not have to remember:

```ts
type Remedy =
  | { kind: 'fix' }
  | { kind: 'suggestion'; because: string }
  | { kind: 'codemod'; codemod: CodemodName; because: string }
  | { kind: 'none'; because: string };

interface OopRuleDocs { concept: string; requiresTypeChecking: boolean; remedy: Remedy }
```

The union is the order of preference, and every kind after `fix` has to say why nothing earlier in the order is
possible. That sentence is the record the rule's docs page shows.

| `remedy.kind` | Who changes the code | What `createRule` does | What a test has to show |
| --- | --- | --- | --- |
| `fix` | `eslint --fix` | sets `meta.fixable` | `output` on each invalid case; RuleTester fails a fixing rule without it [I] |
| `suggestion` | the editor, on confirmation | sets `meta.hasSuggestions` | `suggestions` with their output on each error [I] |
| `codemod` | `oop-codemod <name>` | appends the command to every message | the rule's cases, plus the codemod's own tests |
| `none` | a person | appends `No automatic change: <because>` to every message | the rule's cases |

The author cannot write `fixable` or `hasSuggestions` (omitted from the input type), and ESLint throws when a rule
fixes or suggests without them, so a rule cannot do more or less than its remedy declares. `CodemodName` is
`keyof typeof codemods`, so a message cannot name a codemod that does not exist: until `hide-delegate` is built, a
rule that wants it ships with `kind: 'none'`. `create-rule.test.ts` tests this contract once for all rules.

`src/rules/type-hopping-chain.ts` shows the module shape with the spike's rule: one named export, file named after
the rule, `meta.defaultOptions` (not the deprecated top-level field [M]), the problem sentence only in `messages`.

The audit's `no-restricted-syntax` selectors (about 30) become rules of this plugin, each a file like any other,
because a selector is already a listener key:

```ts
create(context) {
  return {
    'MethodDefinition[kind="constructor"] NewExpression'(node) {
      context.report({ node, messageId: 'newInConstructor' });
    },
  };
}
```

Reasons: `no-restricted-syntax` is one rule with one options slot, so a consumer's own selectors and the preset's
replace each other without a word [M: a later entry with options replaces the earlier options, how.md section 3];
one ID means one selector cannot be turned off alone; and its messages can name a codemod but it can never fix or
suggest. As own rules they get a remedy, their own tests and their own switch. The audit reached the same place:
"The working route is an inline plugin object in flat config, which is what `@layzee/eslint-plugin-oop` becomes."

### Codemods: where they live, how a message names one, how they are tested

- **Where.** One file per codemod in `src/codemods/`, named after it, registered in `src/codemods/index.ts`.
  `src/codemod.ts` holds the contract: `apply(project, target)` edits a ts-morph `Project` in memory, never saves,
  returns `changed` with the file list or `refused` with a reason, and refuses when applied to its own output.
  `src/run-codemod.ts` is the thin command around it (`oop-codemod`, dry run unless `--write`).
- **Engine.** ts-morph only. By the order above a codemod exists only for a cure that leaves the linted file, and
  that needs a project model with resolved declarations. jscodeshift transforms one file at a time, which is the
  ground fixers already cover.
- **How a message names one.** The rule declares `remedy: { kind: 'codemod', codemod: 'hide-delegate', because }`.
  `createRule` appends `Codemod: npx oop-codemod hide-delegate <file>:<line>`. The command text comes from
  `codemodCommand()` in `src/codemod-command.ts`, which the runner's usage output also calls.
- **How they are tested.** `node:test`, with `inMemoryProject({ path: text })` from `src/testing/`: files in, one
  `apply`, files out, no disk. At least three cases per codemod (`hide-delegate.test.ts`): it changes what it
  should, it refuses what it cannot change safely and leaves every file alone, and a second run refuses.
  `codemods/index.test.ts` fails when a codemod file is unregistered or has no test.
- Linting never loads ts-morph: `create-rule.ts` imports the `CodemodName` type only, and `codemod-command.ts` has
  no imports.

### The test harness

`src/testing/rule-testers.ts` is the only way to get a tester, and importing it is what connects both RuleTester
classes to `node:test`. No `--import` preload, so `node --test path/to/one.test.ts` works and the
"Missing definition for `afterAll`" failure [M] cannot happen. Two functions:

- `testRule(rule, cases)` for own rules, under typescript-eslint's RuleTester. It picks the typed or untyped
  tester from the rule's own `requiresTypeChecking`. A rule that claims to need no types but asks for parser
  services fails its own test, instead of crashing `recommended` in a consumer's untyped setup.
- `testConfiguredRules({ [ruleId]: cases })` for configured existing rules, under ESLint's own RuleTester. The
  parameter is `Record<ConfiguredRuleId, ...>`, a type derived from the catalog: a cue with `options` and no cases
  does not compile. Cases cannot carry `options`; the catalog's are added, so a pin tests the preset's
  configuration and nothing else. When the installed rule fixes or suggests, RuleTester demands `output` or
  `suggestions`, so upstream fixers (`method-signature-style`, `prefer-readonly`) are pinned along with the options.
  This shape covers any configured rule, a `no-restricted-syntax` list included, should Lars prefer that route.

Typed cases use typescript-eslint's own layout [M, how.md section 4]: `tests/typed-fixture/` with a strict
`tsconfig.json` that includes an empty `file.ts`, and `projectService: true`. Reasons over the spike's
`allowDefaultProject` layout: explicit strict options (the spike folder has no tsconfig [M], so it ran on
TypeScript defaults, where null checks are off and `repeated-absence-check` could not be tested), and no cap of 8
default-project files [M].

### Drift tests

| Test | Fails when | Where |
| --- | --- | --- |
| catalog vs installed packages | a named rule is missing from the installed package, or deprecated there; the message names package and version | `existing-rules.test.ts`, through `installedRule()` |
| presets load | a rule a preset turns on does not exist or rejects its options | `presets.test.ts`, through the installed ESLint |
| configured cues vs pins | a cue with options has no RuleTester cases (type error), or its cases fail | `existing-rules.test.ts` |
| rules folder vs registry | a rule file is unregistered, misnamed, or untested | `rules/index.test.ts` |
| codemods folder vs registry | the same for codemods | `codemods/index.test.ts` |
| remedy vs message | a `codemod` or `none` rule's messages lack the remedy sentence | `create-rule.test.ts`, `rules/index.test.ts` |

`src/testing/installed-rules.ts` is the only module that imports the optional plugins. Its loader table is
`Record<SourceId, ...>`, so a new catalog source without a loader does not compile. Values loaded by name are
narrowed to a rule by a runtime check (an object with a `create` function), not a cast.

### Nx project targets

`sketch/project.json`: project `eslint-plugin-oop` at `packages/eslint-plugin-oop/` with `typecheck`
(`tsc -p` on the package tsconfig, which extends the root one), `lint` and `test`. `npm run check` picks all three
up through `nx run-many` with no edit.

- `test` is `node --test "packages/eslint-plugin-oop/src/**/*.test.ts"` and is cached, unlike `tooling:test`:
  nothing here reads the git-ignored store. Its inputs name every package whose installed version can change a
  result (`externalDependencies`) and `node --version`, so a dependency bump reruns the drift tests.
- `typecheck` overrides the default inputs to add the same packages, since their types are checked.
- `lint` uses the one root `eslint.config.ts`: one lint bar for the workspace.

Workspace edits this needs (not made; listed for implementation):

1. Root `eslint.config.ts`: add `'packages/*/src/**/*.ts'` to the strict block's `files`; ignore
   `packages/*/tests/**`.
2. Root `project.json`, `tooling:lint`: `eslint . --ignore-pattern "packages/"`, so the two lint targets cover
   disjoint files and `tooling`'s cache inputs (explicit globs without `packages/` [M]) stay true.
3. Root `package.json` devDependencies, exact versions as the house style has them: `@typescript-eslint/utils`,
   `@typescript-eslint/rule-tester`, `@typescript-eslint/eslint-plugin` (8.72.1 each), `eslint-plugin-unicorn`
   80.0.0 (needs eslint >=10.4, Node.js >=22.13 [M]), `eslint-plugin-sonarjs`, `eslint-plugin-functional`,
   `ts-morph`.

### Interface depth

Public surface: one default export with `rules` and six configs, plus one command. Hidden behind it: which
existing rules matter and why, their options, the typed split, the off-skip behaviour that makes
third-party conflicts free, plugin registration and identity, and the remedy contract. A consumer learns three
config names. A contributor learns `createRule`, `testRule` and one catalog line. The surface exposes no layer
names, no option for "which sources", and no internal module: `exports` maps only `.`.

Not done on purpose: no parser or `projectService` setup, no `files` globs, no legacy configs, no program-wide
checks, no detection of which plugins the consumer has.

## Synthesis decision

Arena, 2026-11-18. Runners were candidate-a (Opus, high) and candidate-b (Fable, high). The cross-judge was Sonnet,
medium, and its verdict is in `judge-verdict.md`. Claude read both candidates in full.

**Base: candidate-b.** The judge and Claude agree.
- B derives whether a preset needs type information from the installed rule's metadata. Candidate-a kept a hand-set
  `typed` field.
- B sets no parser in a preset, so the preset is safe to place last. Candidate-a set `tseslint.parser` globally,
  which would hit non-TypeScript files.
- B connects the test hooks by import instead of an `--import` preload.
- B's registry test checks that rule files and test files are in step.

Both candidates reached the same shape on their own: a catalog of borrowed rules (cue or conflict, one per rule
name), a registry of own rules, presets derived from those two, a remedy declared per rule, codemods on ts-morph,
conflicts inside the presets, and selectors as own rules. That agreement is the strongest signal of the run.

**Grafts from candidate-a.** The source files are in `grafts-from-a/`.
1. Selector rules come from rows: `defineSelectorRule` plus a `selectorCues` table, with case blocks keyed by a
   derived `SelectorRuleName`. About 30 selectors become table rows instead of 30 files, and a row without cases
   fails `typecheck`.
2. A `remedy` on borrowed catalog cue rows, using B's `Remedy` with `because`. It records what the borrowed rule
   offers, and the README names the codemod for it.
3. The cure-contract check in `testRule`: `fix` needs a case with `output`, `suggestion` needs one with `suggestions`,
   and `codemod` needs a `curedBy` case. Before and after fixtures are shared by the codemod test and the rule test, so
   a report that its codemod cures passes the rule (`remove-middle-man.fixtures.ts`).

**Changes from Lars's rulings since the runners wrote** (all 2026-11-18, quoted in `../eslint-plugin-oop.plan.md`):
- Presets: `recommended`, `recommended-type-checked`, `strict`, `strict-type-checked`, plus the camelCase aliases
  `recommendedTypeChecked` and `strictTypeChecked`. Every rule in every preset is set to `error`; conflicts are set
  to `off`. This replaces "cues at warn" wherever this document says it, along with the warn-or-off test.
- Each own rule and each cue row carries a `tier: 'recommended' | 'strict'`. `buildConfigs` builds four presets from
  the tier and the derived typed flag. "Every rule in the registry is in a preset" stays.
- Each selector rule is tiered by its measured false-positive rate on lz-gardener, lz-node-test and
  stryker-playwright-runner, run on scratch clones. A selector too noisy for `strict` is dropped.

**Open questions decided by Claude** (low impact, reversible; Claude's calls, not Lars's):
- `class-methods-use-this`: a conflict (`off`), because its message advises making the method `static`. An own rule
  with the right advice may come later.
- Codemods stay in this package while it is private. Where they live is decided at the publishing gate, with
  ts-morph's install size measured.
- Peer range: ESLint `^10.0.0`. The skip of "off" rules was read at v10 only.
- `eslint-plugin-boolean-trap`: named in the README, not added to the catalog.
- Namespace: `@layzee/oop`. Command: `oop-codemod`. Rule docs field: `remedy`.
- A rule that needs a codemod ships in the same wave as that codemod. `none` is only for rules with no mechanical
  cure, and it must give the reason. This follows Lars's ruling that every rule gets a fixer or a codemod where
  possible.

**Left for Lars:** a borrowed rule's message cannot name our codemod (see open question 3 below).

**Rejected from candidate-a:**
- A global parser in the base config.
- The `--import` preload.
- A hand-set `typed` field.
- Getters on `configs`. B's `Object.assign` route is ESLint's documented pattern. The `tsc` risk below decides it,
  and getters are the fallback.

## Tradeoffs accepted

- We accept a peer dependency on `@typescript-eslint/eslint-plugin` and registering it in the preset, against
  typescript-eslint's advice that plugins need not depend on it [M: `docs/developers/ESLint_Plugins.mdx`], in
  exchange for a preset that works in one line. The advice covers plugins that ship only their own rules; this one
  turns typescript-eslint's rules on.
- We accept that the preset sets no parser, in exchange for being safe to place last. A preset that must come
  after the others would replace a Vue or Angular parser if it set one.
- We accept that every rule in the registry is in a preset, in exchange for no per-rule list or flag. A rule too
  noisy for a preset is not ready to ship. A `recommended: false` flag can be added later without breaking anyone.
- We accept one remedy per rule, in exchange for a contract `createRule` can enforce. A rule that could fix some
  reports and only suggest for others is two rules, or the type grows when that case is real.
- We accept `<file>:<line>` as literal text in the codemod command, in exchange for not wrapping `context.report`.
  The lint output prints the location beside the message.
- We accept a mapped type (`ConfiguredRuleId`, about ten lines) in exchange for "configured rule without tests"
  being a compile error instead of a convention.
- We accept the optional plugins and ts-morph as root devDependencies, in exchange for drift tests that run
  against real installed packages.
- We accept ts-morph as a runtime dependency of a lint plugin (it bundles a TypeScript compiler [I]), in exchange
  for one package and one command name in messages. See open question 4.

## Alternatives considered

- **Flat config objects as the source of truth, one hand-written file per preset** (how typescript-eslint ships
  its configs). Smaller to start: no catalog type, no derivation. It lost on depth: reasons live in comments, the
  typed split is a second hand-kept list, the README and the pin tests retype every rule name, and nothing ties a
  configured rule to a test. The consumer-facing surface would be the same; the contributor-facing one is five
  lists.
- **One config per third-party plugin holding both its cues and its conflicts** (`configs.unicorn` = everything
  about unicorn). It mirrors the catalog's grouping, but it hands the consumer a rule to remember, and the cost
  of forgetting is silent: the conflicting autofix keeps running.
- **A config factory**, `oop.config({ typeChecked: true, thirdParty: ['unicorn'] })`. It exposes the internal
  layers as options, cannot be named in a string `extends`, and adds nothing the static configs lack.
- **The selectors as one `no-restricted-syntax` entry.** No rule code, but a single options slot shared with the
  consumer, no per-selector switch, no fix or suggestion ever. Rejected above.
- **jscodeshift for codemods.** Good test ergonomics on Jest, per-file transforms. The codemods here exist only
  for cross-file cures, where it has no project model.
- **A preload module for the test framework hookup** (`node --import setup.ts --test`, the typescript-eslint docs
  recipe). Every command line, IDE run and mutation-test config has to carry the flag; an import cannot be
  forgotten.

## Implementation reconciliation

Wave 1a, 2026-11-18. Each deviation from the sketch and why.

- **Type family: the fallback.** Measured with `tsc` on a probe in the package: a plugin object holding rules built with
  typescript-eslint's types does not type-check as ESLint's `Plugin` (the rule's `create(context)` takes typescript-eslint's
  `RuleContext`, which ESLint's lacks several members of), so neither `Linter.Config[]` nor `defineConfig` accepts it.
  `src/presets.ts` therefore types configs as our own wide `OopConfig` (`name`, `plugins` as `{ meta: { name } }`,
  `rules` as `'error' | 'off'`), and `src/index.ts` types the default export as `OopPlugin` (`meta`, `configs`, no
  `rules`). Both are reached by annotation, not a cast, and `presets.test.ts` type-checks a consumer's `defineConfig`
  with them. `Object.assign` stays; getters were not needed. `OopConfigs` is a type literal, not an interface, because
  ESLint's `Plugin.configs` is a string-keyed record. The config arrays are mutable because `defineConfig` rejects
  readonly ones.
- **`createRule` builds the module itself** instead of calling `ESLintUtils.RuleCreator`: RuleCreator's result types
  `meta.docs` as optional, so every reader (the tester choice, the presets) would need a check. It uses
  `ESLintUtils.applyDefault` with `meta.defaultOptions`, as RuleCreator does.
- **`Remedy` has no `codemod` kind yet.** No codemod registry exists, so `CodemodName` would be `never`. The kind comes
  back with the first codemod wave, together with the `curedBy` cure-contract check.
- **`tier` is in `OopRuleDocs`** (`'recommended' | 'strict'`), per the synthesis decision. `buildConfigs` builds four
  presets plus the two aliases, which are the same arrays as their kebab-case keys. One named layer per preset
  (`oop/recommended`, ...) rather than stacked layers: there are no catalog cues or conflicts yet.
- **No `@typescript-eslint` plugin registration, no conflicts layer, no companion configs** in `buildConfigs`: those
  serve the catalog, which is wave 1b.
- **Cure contract enforcement.** `testRule` throws when the cases never exercise the declared remedy (a `fix` rule
  with no `output`, a `suggestion` rule with no `suggestions`), so a rule's spec fails to load instead of passing.
  The check itself is `cureContractProblem`, tested directly.
- **The node:test hookup wraps** `describe`, `it` and `it.only` in functions that `void` the returned promise, for
  `no-misused-promises` under the workspace's strict lint.
- **Docs URL**: `https://github.com/LayZeeDK-Premium/lz-oop/blob/main/packages/eslint-plugin-oop/docs/rules/<name>.md`,
  Claude's placeholder; no docs pages exist yet.
- **`type-hopping-chain` remedy is `none`** with the reason that the cure adds a delegating method in another file;
  the hide-delegate codemod comes in a later wave.
- **Root devDependencies**: only `@typescript-eslint/utils`, `@typescript-eslint/rule-tester` and
  `@typescript-eslint/eslint-plugin` (8.72.1) were added. unicorn, sonarjs, functional and ts-morph wait for the wave
  that uses them.
- **`.nxignore` ignores `.scratch/`**: the sketch's `project.json` named a second `eslint-plugin-oop` project, which
  broke the Nx graph.

Wave 1b, 2026-11-18. Each deviation from the sketch and why.

- **Catalog rows.** A cue is `{ cue, tier, tierReason, options? }`, a conflict `{ conflict }`; the sources are keyed
  `core`, `@typescript-eslint`, `unicorn`, `sonarjs`, `functional` with `prefix` and `optional`. No `package` field:
  the loader table in `src/testing/installed-rules.ts` (`Record<SourceId, ...>`) names what each source loads. No
  `remedy` on cue rows yet: nothing reads it until the README table; it comes with the README wave.
- **`tierReason`** records each tier choice in one line, next to the rule, so the README can show it.
- **Left out of the catalog:** `naming-convention` (the `…And…` query-and-command regex) and `no-restricted-imports`
  each have one options slot that a consumer's own setting would replace or be replaced by, and the imports to ban
  are the consumer's; `erasableSyntaxOnly` is a tsconfig flag; dependency-cruiser and `import-x/no-cycle` are not
  catalog sources.
- **Extension rules.** `dot-notation` and `no-unused-private-class-members` use the typescript-eslint versions only
  (the first sees `private` bypasses, the second TypeScript `private`). `max-params` is on in both versions, as the
  brief says, so a TypeScript function with five parameters is reported twice.
- **Drift messages** list the missing or deprecated rule IDs; they do not print the package version.
- **Core rule modules** come from `builtinRules` in `eslint/use-at-your-own-risk`, which ESLint 10 marks deprecated
  with no replacement; one disable comment says why.
- **One rules layer per preset**, holding own rules and cues together (`PresetEntry`: id, setting, tier, typed), then
  `oop/conflicts` last. The typed flag of a cue is read from the installed typescript-eslint rule's
  `meta.docs.requiresTypeChecking`; core cues are untyped.
- **`OopConfig.rules`** values are `'error' | 'off' | ['error', ...options]`.
- **Companion configs** (`unicorn`, `sonarjs`, `functional`) hold every cue of their source, whatever its tier. The
  only functional cue, `immutable-data`, needs type information, so `configs.functional` does too.
- **`testConfiguredRules`** runs ESLint's own RuleTester with one setup for every borrowed rule:
  typescript-eslint's parser with the project service on `tests/typed-fixture`, each case's `filename` set to its
  `file.ts`. It refuses a record that misses a configured cue at run time as well as by type. `testConfiguredRule`
  takes the ID as a `string` (it throws on one that is not a configured cue), so the loop over the record needs no
  cast. ESLint 10's RuleTester itself fails a case whose rule fixes without `output` or suggests without
  `suggestions` (read in `lib/rule-tester/rule-tester.js` at v10.13.0).
- **The `class-methods-use-this` wrapper wraps; it does not reimplement.** The spike (scratchpad
  `probes-1b/wrapper-spike.ts`) measured two routes on ESLint 10.13.0: a `Proxy` over the context throws, because
  ESLint freezes the context and a `Proxy` may not return another value for a frozen data property; an
  `Object.create(context)` that shadows `options` and `report` works. `Object.create` returns `any`, so the result is
  held as `unknown` and narrowed by `isRuleContext` (checks `report` and `sourceCode`, the members the upstream rule
  uses). typescript-eslint 8.72.1 has no `ignoreClassesWithImplements` (core's name); its equivalent
  `ignoreClassesThatImplementAnInterface: true` is the default, with `ignoreOverrideMethods: true`. The schema is
  the upstream rule's.

Wave 2, 2026-11-18 (the selector rules). Each deviation from graft 1 and the brief, and why.

- **Files.** `src/define-selector-rule.ts` holds `defineSelectorRule`; the rows are in `src/rules/selector-rules.ts`
  (not `selector-cues.ts`: "cue" names the borrowed rules of the catalog), their cases in
  `src/rules/selector-rules.test.ts`, keyed by the derived `SelectorRuleName` with `satisfies Record<...>`. Renaming a
  row's name without its cases fails `tsc` (measured with a temporary rename). The registry spreads `selectorRules`.
- **Row shape.** `selectors` is a non-empty tuple. The remedy comes from which field the row has: `fix`, `suggest`
  (`message`, `because`, `fix`) or only `because` (remedy `none`). The fields exclude each other by `?: never`. No
  `codemod` kind, as in wave 1a. Every selector rule has message ids `found` and `suggestion`; a row without a
  suggestion never reports the second, which keeps one message type for all rows.
- **`SelectorFix` gets `sourceCode`** and may return several fixes: the `#private` rename edits the modifier, the key
  and each use.
- **`:has(> ...)` is refused** by `defineSelectorRule` with an error naming the row. Measured on ESLint 10.13.0 with
  esquery 1.7.0 and typescript-eslint's parser: `:has(> A)` matches, `:has(> A > B)` silently matches nothing. A test
  pins that behaviour through the installed ESLint, so it fails when an esquery upgrade fixes it.
- **Ship list and forms** (selector-tiers-2.md, merged table). `recommended`: `switch-on-kind`, `ts-private` (the
  X-ts-private-not-di form). `strict`: `module-let`, `options-object-keys` (no callbacks), `new-in-constructor`
  (sharpened), `optional-collaborator`, `optional-private-field` (the X-optional-private-field form, replacing
  `optional-field`). One addition of Claude's, not measured on the corpus: `ts-private` leaves out
  `private constructor`, which cannot be `#private`. The other selectors are the measured forms as written.
- **Remedies.** Only `ts-private` has one: a suggestion that drops `private`, renames the member to `#name` and renames
  each `this.name` in the class body. It is withheld for a decorated member, a class that reads `this[...]`, a
  member also read through another receiver (`other.cents`, `Ids.next`), and a name two members share (get/set
  pairs, overloads, an existing `#name`). Not a fix: a use outside the class body or in another file would break.
  The other six are `none` with the reason in the message; `new-in-constructor` says a codemod that injects the
  collaborator is planned.
- **Test files.** Each selector rule's docs carry `skipsTestFiles: true` (a new optional `OopRuleDocs` field), and
  `buildConfigs` splits every preset layer in two: `oop/<preset>` for the other rules and
  `oop/<preset>/outside-test-files` with `ignores: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/*.d.ts']`.
  Declaration files are added to the brief's globs because a `declare let` or a `private` member in a `.d.ts` is
  emitted output, not code to cure. A config object with `ignores` and `rules` applies only outside those globs, and
  a consumer who wants the rules in tests turns them on in a later config object. `type-hopping-chain` keeps linting
  test files.
- **Preset tests.** One test derives each preset's expected selector rules from the rows' tiers; another lists the
  ship list by name, so a changed tier or a new row shows in a reviewed test edit.
- **Merged with wave 1b.** `PresetEntry` gained `skipsTestFiles` (own rules read it from their docs; catalog cues are
  `false`), and each preset is `oop/plugins`, the two rule layers, then `oop/conflicts`.

## Open questions and risks

Questions for Lars, each with Claude's recommendation:

1. `class-methods-use-this` is in the audit's cue table and in its keep-off list. Which is it? Recommendation:
   conflict (off) now, and a later own rule gives the same signal with advice that fits.
2. Should the audit's selectors ship as own rules instead of a `no-restricted-syntax` entry? Recommendation: yes,
   for the reasons under "One custom rule module".
3. An existing rule's message cannot be changed, so a configured existing rule without an upstream fixer cannot
   name a codemod in its message. Is a README pointer (derived from the catalog) enough, or should such a rule get
   an own-rule twin with a message of ours? Recommendation: README pointer; a twin only where the dogfood run
   shows people need it.
4. Should codemods live in this package (ts-morph installed for everyone who lints) or in a second package?
   Recommendation: this package while it is private; decide at the publishing gate with the install size measured.
5. `eslint-plugin-boolean-trap` conflicts as a whole plugin. List its rules as conflicts (it becomes a
   devDependency for the drift test) or say "do not install it" in the README? Recommendation: README.
6. Should the peer range include ESLint 9? The off-skip was read at v10.13.0 only. Recommendation: `^10.0.0`
   until someone reads the v9 source.
7. Are the public names right: `conflicts`, the companion configs `unicorn`, `sonarjs`, `functional`, the command
   `oop-codemod`, the rule docs field `remedy`?

Risks:

- **Three rule type families under a no-cast rule.** Does `plugins: { '@layzee/oop': plugin }` with
  `RuleCreator`-built rules type-check as `Linter.Config` from `eslint`, and does a consumer's `defineConfig`
  accept it? typescript-eslint itself ships deliberately wide `Compatible*` types for this [M:
  `compatibility-types.ts`]. If it does not type-check, the fallback is wide structural types of our own on
  `OopConfigs`. This is the first thing to settle with `tsc`.
- The typed fixture layout is typescript-eslint's own but has not run in this workspace; the spike ran the other
  layout.
- ESLint's RuleTester behaviour (static `describe`/`it` setters, failing a fixing rule without `output`) is from
  memory: the blob is not in the local partial clone and the network was down.
- ts-morph, eslint-plugin-sonarjs and eslint-plugin-functional have no local clone. Their APIs, versions and
  ESLint 10 support are unverified. The example `messageId`s in the pinned cases are from memory.
- Whether `nx:run-commands` runs a target's `command` from the workspace root by default in Nx 24.0.6 is assumed
  [I]; the sketch's paths rely on it.
- Node.js refuses to strip types under `node_modules` [I], so `exports` and `bin` pointing at `.ts` work only by
  path. Publishing needs the build the plan already prices.

## Next implementation step

Scaffold the project and port the spike rule through `createRule` and `testRule` until `nx run-many -t typecheck
lint test -p eslint-plugin-oop` is green, which settles the type-family and typed-fixture risks before the first
catalog entry is written.
