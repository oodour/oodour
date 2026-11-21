# Selector tiers, second measurement

Written by Claude on 2026-11-18 for Lars's ruling ("1: OK": one rule per `no-restricted-syntax` selector, tier from
the measured false-positive rate, too noisy for `strict` means drop). Status: complete. Part 1 is the second judge,
Part 2 the class-heavy corpus (counts and verdicts), Part 3 the merged tiers, Part 4 the selectors with too few hits.
Working files in this folder: `verdicts-A.tsv`, `verdicts-B.tsv` (every verdict with its reason), `sample.mjs`,
`run2.mjs`, `run3.mjs`, `config-*.mjs`, `extra-selectors.mjs`, and the raw ESLint JSON.

## Method

- Part 1, second judge (blind): the first measurement's hit lists were rebuilt from the raw ESLint JSON in
  `scratchpad/selectors/` with the first measurement's own sampling rule (up to 6 src hits per selector, even spread;
  `sample.mjs` here reproduces `analyze.mjs`; the hit counts match `analysis.txt` exactly, measured). Claude read each
  hit in context against the lz-oop references and wrote its verdicts to `verdicts-A.tsv` before opening the first
  judge's verdict columns (inferred from the order of my own tool calls). For sharpened selectors Claude
  judged up to 10 hits each. Hits the first judge sampled that Claude's even-spread list did not contain were judged
  afterwards (marked EXTRA in `verdicts-A.tsv`); those are judged after seeing the list, not blind.
- Part 2, class-heavy corpus: scratch clones `ngrx/` (`D:/projects/github/ngrx/platform`, HEAD `a797e4b8`) and
  `realworld-angular/` (HEAD `e73088a`) in this folder. ESLint 10 and `@typescript-eslint/parser` from the lz-oop main
  checkout, no type information, `--no-config-lookup`, one config per run (`config-asw.mjs` = the 44 as-written
  selectors, `config-sharp.mjs` = the sharpened ones), `run2.mjs` as driver. No parse error in the four as-written runs
  (measured with `fatal.mjs`; the sharpened and variant runs were not checked the same way). Runs took 1 to 4 s each.
  - ngrx: src = non-spec `.ts` under `modules/*/src/` (254 files); test = every `*.spec.ts` under `modules/*/` (256
    files, including `modules/*/spec/` and schematics specs). `.d.ts` skipped.
  - realworld-angular: src = non-spec `.ts` under `src/` (85 files); test = `*.spec.ts` (59 files).
- Tier rule as in the brief. Angular and NgRx framework forms at the edges (decorators, DI constructors, lifecycle
  hooks) count as false positives. All verdicts are Claude's reading of the lz-oop references (inferred); each hit
  count is measured.

## Part 1. Second judge on the first corpus (lz-gardener, lz-node-test, stryker-playwright-runner)

Columns: J1 = first judge, J2 = this judge, as TP (true positive) / FP counts over the same hits. Agreement is hits
with the same verdict over hits compared.

| Selector | Hits compared | J1 TP/FP | J2 TP/FP | Agree |
| --- | --- | --- | --- | --- |
| switch-on-kind | 5 | 5/0 | 5/0 | 5/5 |
| optional-collaborator | 1 | 1/0 | 0/1 | 0/1 |
| boolean-parameter | 6 | 4/2 | 0/6 | 2/6 |
| optional-field | 5 | 4/1 | 3/2 | 3/5 |
| module-let | 4 | 3/1 | 3/1 | 4/4 |
| options-object-keys | 6 | 3/3 | 4/2 | 5/6 |
| boolean-literal-argument (= S-flag-argument) | 6 | 3/3 | 2/4 | 5/6 |
| in-operator | 6 | 2/4 | 1/5 | 5/6 |
| instanceof | 6 | 0/6 | 0/6 | 6/6 |
| typeof | 6 | 0/6 | 0/6 | 6/6 |
| type-predicate | 6 | 0/6 | 0/6 | 6/6 |
| numeric-index | 6 | 0/6 | 0/6 | 6/6 |
| property-chain-3 | 6 | 2/4 | 3/3 | 5/6 |
| S-message-chain-4 | 4 | 0/4 | 2/2 | 2/4 |
| call-chain-3 | 6 | 0/6 | 0/6 | 6/6 |
| multi-statement-loop | 6 | 1/5 | 0/6 | 5/6 |
| for-statement | 6 | 0/6 | 0/6 | 6/6 |
| inline-null-object | 6 | 0/6 | 0/6 | 6/6 |
| query-assigns-this | 6 | 2/4 | 1/5 | 5/6 |
| new-in-method | 9 | 1/8 | 1/8 | 9/9 |
| new-in-constructor | 3 | 0/3 | 0/3 | 3/3 |
| new-as-default | 3 | 0/3 | 0/3 | 3/3 |
| S-default-collaborator | 1 | 0/1 | 0/1 | 1/1 |
| return-in-place-mutation | 3 | 0/3 | 0/3 | 3/3 |
| S-forwarder | 2 | 0/2 | 0/2 | 2/2 |
| template-lookup | 1 | 0/1 | 0/1 | 1/1 |
| proxy | 1 | 0/1 | 0/1 | 1/1 |
| T-boolean-literal-to-own-function | 14 | 8/6 | 6/8 | 12/14 |
| T-options-object-keys | 10 | 6/4 | 5/5 | 7/10 |
| T-instanceof-not-error | 10 | 0/10 | 0/10 | 10/10 |
| T-in-literal-key-not-code | 10 | 5/5 | 7/3 | 8/10 |
| T-query-assigns-this | 5 | 2/3 | 1/4 | 4/5 |
| T-new-in-method | 1 | 1/0 | 1/0 | 1/1 |
| T-numeric-index-not-first | 6 | 1/5 | 0/6 | 5/6 |
| T-collection-loop-long-body | 4 | 1/3 | 0/4 | 3/4 |
| T-module-let | 4 | 3/1 | 3/1 | 4/4 |

Overall (counted from the table): 190 hit comparisons, 165 agree (87 percent). The 25 disagreeing hits fall in 17
items below, each with both reasons. T-module-let repeats the four module-let hits, so 186 comparisons are distinct.

1. optional-collaborator, `spr:reporter.ts:82` (`this.#suite?.allTests() ?? []`). J1 TP: `?.` on a collaborator is still
   the absence check. J2 FP: one check that supplies a plain default (`[]`), which `javascript-and-typescript.md` ("Absence")
   allows; no repeated check, no inline behaviour.
2. boolean-parameter, `nt:runner.ts:412` and `spr:csf.ts:262`. J1 TP: the flag picks a branch. J2 FP: each is a fact
   derived by the caller (checkers present, factory file), not a mode the caller chooses; `variants-and-conditionals.md`
   says a value computed at run time and passed along is not a flag argument.
3. boolean-parameter, `spr:run-result.ts:72` and `:401`. J1 TP: `failOnFlakyTests` is threaded through four functions that
   each branch on it (that is Repeated Switches). J2 FP: it is the user's option passed along. J2 did not count the
   functions it is threaded through; J1's reading is the stronger one (measured: four `failOnFlakyTests: boolean`
   parameters in `run-result.ts`).
4. optional-field, `nt:runner.ts:553` (`#initialized?: Promise<void>`). J1 TP: state set in `init` and read later. J2 FP:
   Stryker's pool contract forces the init/dispose lifecycle. J2's argument is weaker, since `javascript-and-typescript.md`
   asks a framework adapter to hand the work to a plain object.
5. optional-field, `nt:runner.ts:560` (`#mutantsOutsideTests?`). J1 FP: the lazy backing field the plugin allows. J2 TP:
   it is set in one method and read in another. J1's reading is right: the field is read only through
   `#outsideTests()`, the lazy form the reference allows.
6. options-object-keys, `spr:run-request.ts:53`. J1 FP: the parameter is Stryker's own options type. J2 TP: six keys
   bundled into one object. Not checked which side owns the type.
7. boolean-literal-argument and S-flag-argument, `nt:hook-core.ts:251` (`callSites(false)`). J1 TP: a literal picks a mode.
   J2 FP: `callSites` only forwards the value into a dependency option and does not branch on it.
8. T-boolean-literal-to-own-function, the same hit at `:249` and `:251`: same split as 7, two hits.
9. in-operator, `spr:server-checks.ts:33`. J1 TP: `'port' in target` picks a branch. J2 FP: each branch only builds a
   check object with the same two members, which is the choosing conditional `variants-and-conditionals.md` accepts.
10. property-chain-3, `spr:jsx-mutators/mutators.ts:371` (`site.value.expression.type`). J1 FP: AST navigation. J2 TP:
    the chain starts at an object of the project's own (`site`) and runs through its `value`.
11. S-message-chain-4, `spr:interaction-hints.ts:231` and `spr:reporter.ts:119` (`mutant.location.start.line`). J1 FP: a
    library data record. J2 TP: the chain starts at the project's own `survivor` or `plan` and `Hide Delegate` would
    give it a `line`. The two readings differ on whether the entry object's owner decides.
12. multi-statement-loop and T-collection-loop-long-body, `spr:traces-index.ts:87`. J1 TP: reads and validates each folder
    inline. J2 FP: a loop with `continue` and file-system side effects, not a collection pipeline; the references
    name no cure for it.
13. query-assigns-this, `spr:lz-playwright-test-runner.ts:506` (`#run`). J1 TP: records `#previousRun` and returns the
    output. J2 FP: an action that performs a run and returns its output, not a query.
14. T-query-assigns-this, `spr:lz-playwright-test-runner.ts:533`: the same `#run`, same split.
15. T-options-object-keys, `nt:runner.ts:171` and `spr:transform.ts:64`. J1 TP: five or six fields read out of a parameter.
    J2 FP: the parameter is a data record (a file run, a stub definition) unpacked in the signature, so the whole object is
    already passed.
16. T-in-literal-key-not-code, `spr:lz-playwright-test-runner.ts:630` and `spr:reporter.ts:177`. J1 FP: a success-or-error
    result and an optional key. J2 TP: both branch on the key of a union.
17. T-numeric-index-not-first, `gard:store-git.ts:353` (`fields[2] !== undefined`). J1 TP: read past any converter. J2 FP:
    a tuple type guard written inside the code that splits git's output, which is the converter.

Where a disagreement could move a tier (inferred): boolean-parameter (J1 says 4 of 6 are true, so `strict`; J2 says
none, so `drop`) and optional-collaborator (n=1, so thin either way). The others leave the tier where it was: the
selectors both judges find at least half acceptable stay `drop`, and the selectors both find mostly true stay
`strict` or better.

## Part 2. Class-heavy corpus: hit counts (measured)

Hits per repository as src/test, ngrx then realworld-angular. A selector absent from a table had no hit in either
repository.

### As written

| Selector | ngrx | realworld-angular |
| --- | --- | --- |
| S-flag-argument | 14/409 | 58/122 |
| S-forwarder | 51/16 | 25/0 |
| S-message-chain-4 | 7/84 | 2/8 |
| S-new-in-constructor-nonbuiltin | 5/0 | 1/0 |
| S-query-and-command | 3/1 | 10/0 |
| arrow-property | 1/0 | 0/0 |
| boolean-literal-argument | 14/407 | 58/122 |
| boolean-parameter | 14/7 | 0/0 |
| call-chain-3 | 7/46 | 7/0 |
| data-class | 5/62 | 13/5 |
| extends-builtin | 0/2 | 0/0 |
| for-statement | 6/0 | 1/0 |
| in-operator | 18/53 | 0/0 |
| inline-null-object | 4/0 | 1/0 |
| instanceof | 31/20 | 0/5 |
| module-let | 1/8 | 1/0 |
| multi-statement-loop | 19/4 | 0/0 |
| new-in-constructor | 6/1 | 1/0 |
| new-in-method | 36/3 | 0/0 |
| numeric-index | 39/326 | 4/33 |
| optional-collaborator | 0/0 | 4/0 |
| optional-field | 24/10 | 0/0 |
| options-object-keys | 2/1 | 0/0 |
| property-chain-3 | 38/373 | 15/71 |
| protected-member | 105/2 | 128/0 |
| proxy | 1/1 | 0/0 |
| query-assigns-this | 3/0 | 0/0 |
| static-method | 16/0 | 0/0 |
| super-call-in-method | 2/0 | 0/0 |
| switch-true | 4/0 | 0/0 |
| template-lookup | 0/6 | 0/0 |
| ts-private | 157/14 | 86/0 |
| type-predicate | 46/1 | 2/0 |
| typeof | 84/13 | 1/0 |

No hit in either repository (measured): switch-on-kind, assign-to-prototype, throw-only-override, mixin-factory,
new-as-default, S-default-collaborator, return-in-place-mutation, exported-let, entity-method, lifecycle-decorator.

### Sharpened

| Selector | ngrx | realworld-angular |
| --- | --- | --- |
| T-boolean-literal-to-own-function | 2/56 | 33/34 |
| T-collection-loop-long-body | 4/0 | 0/0 |
| T-in-literal-key-not-code | 3/53 | 0/0 |
| T-inline-null-object | 1/0 | 0/0 |
| T-instanceof-not-error | 27/15 | 0/5 |
| T-module-let | 1/8 | 1/0 |
| T-new-in-constructor | 5/0 | 1/0 |
| T-new-in-method | 42/3 | 0/0 |
| T-numeric-index-not-first | 11/188 | 1/7 |
| T-options-object-keys | 1/0 | 0/0 |
| T-query-assigns-this | 1/0 | 0/0 |

No hit: T-new-as-default, T-return-own-field-mutated.

### Variants written for this corpus

The as-written `ts-private`, `protected-member`, `data-class`, `static-method` and `new-in-method` hits were dominated
by Angular and NgRx forms, so Claude wrote narrower variants (`extra-selectors.mjs`) and ran them on both corpora
(measured).

| Variant | Selector | ngrx src/test | realworld-angular src/test |
| --- | --- | --- | --- |
| X-ts-private-not-di | `:matches(PropertyDefinition, MethodDefinition)[accessibility='private']:not(PropertyDefinition[value.callee.name='inject'])` | 82/1 | 22/0 |
| X-ts-private-field-not-inject | `PropertyDefinition[accessibility='private']:not([value.callee.name='inject'])` | 39/0 | 17/0 |
| X-ts-private-method | `MethodDefinition[accessibility='private']` | 43/1 | 5/0 |
| X-ts-parameter-property | `TSParameterProperty[accessibility='private']` | 73/13 | 0/0 |
| X-protected-method | `MethodDefinition[accessibility='protected']` | 84/2 | 42/0 |
| X-data-class-undecorated | `ClassDeclaration:not([decorators.length>0]) > ClassBody:not(:has(MethodDefinition)):has(PropertyDefinition)` | 4/45 | 0/0 |
| X-static-method-not-angular | `MethodDefinition[static=true]:not([key.name=/^(forRoot\|forFeature\|instrument\|ng[A-Z].*)$/])` | 0/0 | 0/0 |
| X-new-in-method-not-argument | `MethodDefinition[kind='method'] NewExpression:not([callee.name=/(Error\|Set\|Map\|Subject\|Date)$/]):not(CallExpression > NewExpression):not(ReturnStatement > NewExpression)` | 10/2 | 0/0 |
| X-optional-private-field | `PropertyDefinition[optional=true][key.type='PrivateIdentifier']` | 0/0 | 0/0 |
| X-boolean-literal-not-signal | `CallExpression[callee.type="Identifier"][callee.name!=/^(signal\|input\|model\|computed\|booleanAttribute)$/] > Literal.arguments[raw=/^(true\|false)$/]` | 2/53 | 2/0 |
| X-super-call-not-lifecycle | `MethodDefinition[kind='method'][key.name!=/^ng[A-Z]/] CallExpression > MemberExpression.callee[object.type='Super']` | 1/0 | 0/0 |

On the first corpus (measured with `run3.mjs` and `count3.mjs`): X-optional-private-field has 5 src hits, all in
`runner.ts` of lz-node-test; X-boolean-literal-not-signal has the same 14 src hits as T-boolean-literal-to-own-function;
X-new-in-method-not-argument has 3, all in `lz-playwright-test-runner.ts`; the others have none.

Composition of the as-written `ts-private` hits (measured by the variant counts): 243 src hits, of which 73 are
constructor parameter properties and 64 are `inject()` fields, so 139 (57 percent) are Angular dependency injection
forms. The remaining 104 are private fields (56) and private methods (48).

### Verdicts on the class-heavy corpus

Up to 8 src hits per selector, even spread over the hit list (the same rule as the first measurement; every hit when
there were 8 or fewer). TP/FP are this judge's counts; each hit and its reason is in `verdicts-B.tsv`. Hits are src hits,
ngrx plus realworld-angular.

| Selector | Hits | Sampled | TP/FP | Verdicts in short |
| --- | --- | --- | --- | --- |
| S-flag-argument, boolean-literal-argument | 72 | 8 | 0/8 | `signal(false)`, `.set(false)`, `input(false)` state values; a devkit call |
| T-boolean-literal-to-own-function | 35 | 8 | 0/8 | Angular `input(false)` and `signal(false)`; X-boolean-literal-not-signal: 0/4 (devkit, RxJS `of(true)`) |
| boolean-parameter | 14 | 8 | 0/8 | loading and pause values passed along; closest to a flag is `injectZoneConfig(connectInZone)` |
| S-forwarder | 76 | 8 | 4/4 | TP: `EntityCollectionServiceBase` forwards to its dispatcher; FP: Angular setter, `Store.complete`, two `HttpClient` wrappers |
| S-message-chain-4 | 9 | 8 | 1/7 | ESTree reads; TP: a write through `document.body.style.overflow` (weak) |
| property-chain-3 | 53 | 8 | 2/6 | ESTree and devkit data, signal-forms tree; TP: `act.payload.data.error`, the DOM write (both weak) |
| call-chain-3 | 14 | 8 | 0/8 | RxJS and array pipelines |
| S-new-in-constructor-nonbuiltin, T-new-in-constructor | 6 | 6 | 4/2 | TP: `new EntityActionGuard(...)` and `x \|\| new X()` defaults in NgRx Data; FP: `ReplaySubject`, `ResizeObserver` |
| new-in-constructor | 7 | 7 | 4/3 | the same plus `throw new Error` |
| new-in-method, T-new-in-method | 36, 42 | 8 each | 0/8 | action and error message objects, factory methods, `Subject`; X-new-in-method-not-argument 1/7 |
| S-query-and-command | 13 | 8 | 0/8 | matches on the method name `add`, `set`, `delete` |
| arrow-property | 1 | 1 | 0/1 | a private bound function, not a hook |
| data-class, X-data-class-undecorated | 18, 4 | 8, 4 | 0/8, 0/4 | Angular components with signal inputs, NgRx action classes, DI config classes |
| for-statement | 7 | 7 | 0/7 | indexed array loops |
| multi-statement-loop, T-collection-loop-long-body | 19, 4 | 8, 4 | 0/8, 0/4 | side-effecting registration, AST walks |
| in-operator, T-in-literal-key-not-code | 18, 3 | 8, 3 | 0/8, 0/3 | key membership in a record, hook detection, duck-type guards |
| inline-null-object, T-inline-null-object | 5, 1 | 5, 1 | 1/4, 1/0 | TP: `options.selectId ?? ((e) => e.id)`; FP: `?? {}` |
| instanceof, T-instanceof-not-error | 31, 27 | 8 each | 1/7, 0/8 | TP: branch on the kind of an injected serializer; FP: Angular router events, devkit `Change` classes, `InjectionToken` |
| module-let, T-module-let | 2 | 2 | 2/0 | `let _ngrxMockEnvironment` flag; id counter (weak) |
| numeric-index, T-numeric-index-not-first | 43, 12 | 8 each | 0/8 | first argument, AST ranges, regex groups |
| optional-collaborator | 4 | 4 | 4/0 | `this.data?.x ?? default` four times in one dialog component |
| optional-field | 24 | 8 | 0/8 | `@Input` and optional configuration properties |
| options-object-keys, T-options-object-keys | 2, 1 | 2, 1 | 1/1, 1/0 | TP: `getImportAddFix({...})` options bag with defaults |
| protected-member, X-protected-method | 233, 126 | 8 each | 0/8 | subclass hooks of NgRx Data and Angular template members |
| proxy | 1 | 1 | 0/1 | `toDeepSignal` synthesises nested signals, not a forwarder |
| query-assigns-this, T-query-assigns-this | 3, 1 | 3, 1 | 0/3, 0/1 | an id generator's `next()`, `create*` methods |
| static-method | 16 | 8 | 0/8 | `forRoot`, `forFeature`, `instrument`, a template guard: all Angular modules |
| super-call-in-method, X-super-call-not-lifecycle | 2, 1 | 2, 1 | 1/1, 1/0 | TP: `ActionsSubject.next` validates, then `super.next`; FP: `ngOnDestroy` |
| switch-true | 4 | 4 | 0/4 | one priority cascade returning an enum, copied in two files |
| ts-private | 243 | 8 | 5/3 | TP: private fields and methods; FP: DI constructor parameter property, `inject()` fields |
| X-ts-private-not-di | 104 | 8 | 8/0 | private state and methods; X-ts-private-field-not-inject 8/0 and X-ts-private-method 8/0 also |
| X-ts-parameter-property | 73 | 8 | 0/8 | every one is an Angular DI constructor |
| type-predicate | 48 | 8 | 0/8 | narrowing guards, lifecycle-hook detection |
| typeof | 85 | 8 | 0/8 | value-or-function arguments, `ngDevMode`, `window` |

Judging notes (inferred): Angular and NgRx forms counted as false positives were decorators and `@Input`, DI
constructors (`constructor(private x: X)`) and `inject()` fields, NgModule `forRoot`/`forFeature`, template-bound
`protected` members, signal `input(false)`/`signal(false)`/`model(false)`, lifecycle hooks (`ngOnDestroy`) and NgRx
action classes. A private field or method with no DI role counted as a true positive, because
`javascript-and-typescript.md` ("Private state") asks for `#private`. Optional configuration properties and `@Input`
fields were not counted as Temporary Fields.

Test files (measured, ngrx and realworld-angular): S-flag-argument has 409 and 122 test hits, numeric-index 326 and 33,
property-chain-3 373 and 71, S-message-chain-4 84 and 8. The first measurement's advice to switch these rules off for
test globs holds here too (inferred).

## Part 3. Merged tiers

Counting rule: each hit judged by each judge is one judgement, so a first-corpus hit that both judges read counts
twice and a class-heavy hit once. FP share = FP judgements over all judgements. Columns: hits are src hits (first corpus
A, class-heavy B); J1 and J2 on A, J2 on B, each as TP/FP. A dash means no hit. Tier rule from the brief; a form
replaces the as-written selector it names.

### Proposed tiers

| Selector (form) | Hits A / B | J1 A | J2 A | J2 B | FP share | Tier | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| switch-on-kind | 5 / 0 | 5/0 | 5/0 | - | 0/10 = 0% | `recommended` | every hit does each kind's work; the class-heavy corpus has no `switch (x.kind)`, so five hits from one author back it |
| X-ts-private-not-di (replaces ts-private) | 0 / 104 | - | - | 8/0 | 0/8 = 0% | `recommended` | 8 of 104 sampled, all private fields or methods; the as-written selector is 57 percent DI forms (see Part 2); X-ts-private-field-not-inject and X-ts-private-method each 8/0 |
| module-let | 4 / 2 | 3/1 | 3/1 | 2/0 | 2/10 = 20% | `strict` | module state read as ambient context; the one FP is a timer in a bench script; test files excluded |
| options-object-keys, T (no callbacks) | 10 / 1 | 6/4 | 5/5 | 1/0 | 9/21 = 43% | `strict` | the FPs are records unpacked in the signature; as written it is 8/6 on 22 judgements, also 43 percent |
| T-new-in-constructor (replaces new-in-constructor, S-new-in-constructor-nonbuiltin) | 0 / 6 | - | - | 4/2 | 2/6 = 33% | `strict` | six hits, four of them one NgRx Data module; FPs are `ReplaySubject` and `ResizeObserver`; as written 4/9 (69 percent FP) |
| optional-collaborator | 1 / 4 | 1/0 | 0/1 | 4/0 | 1/6 = 17% | `strict` | the four class-heavy hits are one file; the first-corpus hit is judged FP by J2 and TP by J1 |
| X-optional-private-field (replaces optional-field) | 5 / 0 | 4/1 | 3/2 | - | 3/10 = 30% | `strict` | all five hits are fields of one class (`runner.ts`); as written, optional-field is 7/11 (61 percent FP) because `@Input` and configuration properties match |

Update, 2026-11-21 (Lars's rulings, recorded in `../eslint-plugin-oop.plan.md`, "Rulings, 2026-11-20 (night)"): the
table above is the measurement as it stood. Shipped since: `switch-on-kind` moved to `strict` (d7dc465); a new
`flag-argument` rule, in `recommended` (d325d7c), reports a boolean parameter that the function itself branches on, a
narrower form than the dropped `boolean-parameter` and `S-flag-argument` selectors below (one true positive in its probe
run, `presets.ts` `rulesOf`). `ts-private` is to leave every preset (opt-in), pending the marker-or-lock oracle answers.

### Drop

| Selector (form) | Hits A / B | J1 A | J2 A | J2 B | FP share | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| boolean-parameter | 24 / 14 | 4/2 | 0/6 | 0/8 | 16/20 = 80% | the two judges split on A (J1 says `failOnFlakyTests` threading is a flag); B holds only passed-along values. Moves from `strict` (first measurement) to `drop` |
| boolean-literal-argument, S-flag-argument | 31 / 72 | 3/3 | 2/4 | 0/8 | 15/20 = 75% | library calls and Angular `signal(false)`/`input(false)` |
| T-boolean-literal-to-own-function | 14 / 35 | 8/6 | 6/8 | 0/8 | 22/36 = 61% | still drops on B; X-boolean-literal-not-signal gives 18/32 = 56 percent |
| in-operator | 44 / 18 | 2/4 | 1/5 | 0/8 | 17/20 = 85% | boundary guards, record membership |
| T-in-literal-key-not-code | 28 / 3 | 13/15 (all 28) | 7/3 (10) | 0/3 | 21/41 = 51% | knife edge; J1 found 13 of 28 true, J2 7 of 10, B 0 of 3. A typed rule on project unions would keep the true ones |
| instanceof, T-instanceof-not-error | 39 / 31 | 0/6, 0/15 | 0/6, 0/10 | 1/7, 0/8 | 19/20 and 33/33 | catch narrowing, built-ins, framework hierarchies |
| typeof | 273 / 85 | 0/6 | 0/6 | 0/8 | 20/20 | boundary validation |
| type-predicate | 71 / 48 | 0/6 | 0/6 | 0/8 | 20/20 | boundary guards |
| numeric-index, T-numeric-index-not-first | 100 / 43 | 0/6, 1/5 | 0/6, 0/6 | 0/8, 0/8 | 20/20 and 19/20 | regex groups, AST ranges, first elements |
| property-chain-3 | 50 / 53 | 2/4 | 3/3 | 2/6 | 13/20 = 65% | AST and library data; the true hits are chains through the project's own objects |
| S-message-chain-4 | 4 / 9 | 0/4 | 2/2 | 1/7 | 13/16 = 81% | AST |
| call-chain-3 | 107 / 14 | 0/6 | 0/6 | 0/8 | 20/20 | pipelines and builders |
| multi-statement-loop, T-collection-loop-long-body | 35 / 19 | 1/5, 1/3 | 0/6, 0/4 | 0/8, 0/4 | 19/20 and 11/12 | |
| for-statement | 17 / 7 | 0/6 | 0/6 | 0/7 | 19/19 | |
| inline-null-object (as written) | 13 / 5 | 0/6 | 0/6 | 1/4 | 16/17 = 94% | `?? {}` plain defaults |
| query-assigns-this, T-query-assigns-this | 8 / 3 | 2/4, 2/3 | 1/5, 1/4 | 0/3, 0/1 | 12/15 and 8/11 | lazy caches, lifecycle contracts, pop-like messages |
| new-in-method, T-new-in-method | 9 / 36 | 1/8, 1/0 | 1/8, 1/0 | 0/8, 0/8 | 24/26 and 8/10 | message objects, factories, errors |
| new-as-default, S-default-collaborator | 3 / 0 | 0/3 | 0/3 | - | 6/6 and 2/2 | a clock and an empty `Map` default |
| return-in-place-mutation | 3 / 0 | 0/3 | 0/3 | - | 6/6 | |
| S-forwarder | 2 / 76 | 0/2 | 0/2 | 4/4 | 8/12 = 67% | Middle Man is a per-class ratio; the true hits are one facade class |
| S-query-and-command | 0 / 13 | - | - | 0/8 | 8/8 | name match only |
| data-class, X-data-class-undecorated | 0 / 18 | - | - | 0/8, 0/4 | 8/8 | Angular components, action and config classes. Moves from provisional `strict` to `drop` |
| protected-member, X-protected-method | 0 / 233 | - | - | 0/8, 0/8 | 8/8 | hooks the reference allows, Angular template members. Moves from provisional `strict` to `drop` |
| static-method | 0 / 16 | - | - | 0/8 | 8/8 | all 16 are Angular module statics; X-static-method-not-angular has 0 hits. Moves from provisional `strict` to `drop` |
| switch-true | 0 / 4 | - | - | 0/4 | 4/4 | a priority cascade, not a kind switch. Moves from provisional `recommended` to `drop` |
| template-lookup | 1 / 0 | 0/1 | 0/1 | - | 2/2 | one hit |
| proxy | 1 / 1 | 0/1 | 0/1 | 0/1 | 3/3 | two hits |

Changes from the first measurement's proposal, in one line each: `boolean-parameter` strict to drop;
`optional-field` strict to X-optional-private-field (still `strict`); `ts-private` provisional `recommended` to the
sharpened X-ts-private-not-di (`recommended`, now measured); `new-in-constructor` provisional `recommended` to `strict`
(measured, 2 of 6 FP); `optional-collaborator` `recommended` to `strict`; `protected-member`, `static-method`,
`data-class` provisional `strict` to `drop`; `switch-true` provisional `recommended` to `drop`.

## Part 4. Selectors that still have too few hits to tier

Src hits across both corpora (first corpus / class-heavy). Where a verdict exists it is shown; the first judge's
provisional tier stands as inferred, not measured.

| Selector | Hits | Note |
| --- | --- | --- |
| T-inline-null-object | 0 / 1 | the one hit (`options.selectId ?? ((e) => e.id)`) is a true positive: provisional `recommended` |
| T-new-as-default | 0 / 0 | one test hit in the first corpus |
| T-return-own-field-mutated | 0 / 0 | |
| X-super-call-not-lifecycle (super-call-in-method) | 0 / 1 (2) | `ActionsSubject.next` is a true positive; the other hit is `ngOnDestroy` |
| arrow-property | 0 / 1 | a private bound function, FP |
| X-new-in-method-not-argument | 3 / 10 | A: 1 TP, 2 FP (one real hit); B: 1 TP, 7 FP |
| template-lookup | 1 / 0 | FP |
| proxy | 1 / 1 | both FP |
| new-as-default, S-default-collaborator | 3, 1 / 0 | all FP |
| return-in-place-mutation | 3 / 0 | all FP |
| extends-builtin | 0 / 0 | test hits only: 0 in the first corpus, 2 in ngrx (not judged) |
| assign-to-prototype | 0 / 0 | test hits only: 3 in the first corpus |
| mixin-factory, throw-only-override, exported-let | 0 / 0 | no hit in any of the five repositories |
| entity-method, lifecycle-decorator | 0 / 0 | zero hits in all five repositories (measured; no positive control run, so a broken selector is not ruled out) |

## Limits (inferred unless marked)

- The class-heavy corpus is two Angular and NgRx codebases: it measures the Angular and NgRx forms the plugin accepts,
  and says little about plain domain classes. Selectors that find only framework forms there (`data-class`,
  `protected-member`, `static-method`) may still be sound on code that has no framework.
- Samples are 8 or fewer hits per selector; a selector with thousands of hits (`typeof`, `numeric-index`) is judged on 8.
- Claude made every verdict. J2 on the first corpus is independent of J1 only in that it did not see J1's verdicts while
  judging; both read the same references with the same model.
- Combined shares count a first-corpus hit once per judge.
- Measured: every hit count and every ESLint run. Inferred: every TP or FP verdict, and every tier.
