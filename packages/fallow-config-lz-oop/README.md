# @layzee/fallow-config-lz-oop

A [Fallow](https://github.com/fallow-rs/fallow) config preset for `lz-oop`. It sets the few Fallow thresholds that
make `fallow health` point at the places the `lz-audit` skill looks at first: complex functions inside often-changed
files, files that change together without importing each other, and files too long to read. It fails the run
(severity `error`, not `warn`) on a function over the complexity limits or a source file over the length limit.
Everything else stays at Fallow's defaults.

The limits exist so that code a person approves stays readable to that person, whoever wrote it, an agent or a human.

Written for and measured with Fallow 3.43.2. The package is private and unpublished for now.

## Use it

Extend it from your own `.fallowrc.json` by path today:

```json
{
  "extends": "./path/to/lz-oop/packages/fallow-config-lz-oop/fallowrc.json"
}
```

Once the package is published, extend it by name: `"extends": "npm:@layzee/fallow-config-lz-oop"`.

Fallow merges `extends` sources in order, object by object, and your own file's keys win. To use a stricter or looser
value than the preset, set the same key in your own file.

## What you must set yourself

The preset cannot know where your program starts, and without that every number Fallow reports is wrong. On
lz-gardener, an unconfigured run found 3 entry points, called 58 of 62 files unused, and scored the project 43 (D);
with the entries below set, it found 1 unused file and scored 87.6.

- `entry`: the files that run in production: CLIs, servers, the module a package exports.
- `supportEntry`: tests, tooling and scripts that run outside production. List test utility modules too (for example
  `test-*.ts`) when their names do not match a test pattern. With `production: true`, Fallow then leaves all of them
  out, so the importer count (fan-in) of a module counts production importers only, as `lz-audit` counts them.
  Without `production: true`, tests and their utilities count as importers.
- `dynamicallyLoaded`: files loaded by a computed path or URL (for example a worker or a child process started from a
  `new URL(...)`), which Fallow cannot see as imports and would report as unused.

The lz-gardener example, where the four CLIs are the production entry points:

```json
{
  "extends": "./path/to/lz-oop/packages/fallow-config-lz-oop/fallowrc.json",
  "entry": [
    "plugins/lz-gardening/skills/lz-garden/scripts/census.ts",
    "plugins/lz-gardening/skills/lz-garden/scripts/diffs.ts",
    "plugins/lz-gardening/skills/lz-garden/scripts/site.ts",
    "plugins/lz-gardening/skills/lz-garden/scripts/weeds.ts"
  ],
  "supportEntry": ["**/*.test.ts", "tools/**/*.ts", "plugins/lz-gardening/skills/lz-garden/scripts/test-*.ts"],
  "dynamicallyLoaded": ["plugins/lz-gardening/skills/lz-garden/scripts/test-git-starts.ts"],
  "production": true
}
```

With this config, `fallow health --since 1y` gave the importer counts the lz-gardener audit counted by hand for the
five most-imported modules (12, 10, 8, 4 and 3), and `fallow dead-code` run without `production` no longer reported
the dynamically loaded file as unused.

Two settings are command-line flags only, with no config key:

- `--since`: the history window for hot spots. `lz-audit` counts churn over the last year, so run
  `fallow health --since 1y` to match it; Fallow's own default window is 6 months.
- `--coverage`: Istanbul or V8 coverage data. Without it Fallow estimates coverage, and on lz-gardener it estimated none
  for all 66 functions it flagged, although every module there has tests. With no coverage the CRAP score is just
  cyclomatic² + cyclomatic, so every function of cyclomatic complexity 5 or more reaches the default CRAP limit of 30
  and gets an "add tests" finding. Read CRAP findings only from a run with `--coverage`.

## The values

Every key the preset sets, the `lz-oop` guidance it serves, and why the number. The test suite checks that this table
and `fallowrc.json` hold the same keys and values.

<!-- preset-values:start -->

| Key | Value | Serves | Why this number |
| --- | --- | --- | --- |
| `minimumVersion` | `"3.43.2"` | All of the below | The version every value was measured on. An older Fallow stops with a message naming both versions instead of failing on an unknown key. |
| `rules.complexity-cyclomatic` | `"error"` | The cyclomatic limit below. | Fallow's default is already `error`; stating it keeps the gate failing if that default changes. A function over the limit fails the run. |
| `rules.complexity-cognitive` | `"error"` | Cognitive complexity, the second reading of how hard a function is to follow. | Stated for the same reason. Its default limit of 15 stays, and on lz-gardener it flags 3 functions, all among the ones the cyclomatic limit flags. |
| `rules.complexity-crap` | `"error"` | Complex functions that no test covers. | Stays at `error`. CRAP needs coverage data: run `fallow health --coverage` with Istanbul or V8 coverage. Without it, Fallow estimates coverage and the score fires on ordinary functions: 45 to 81% of the findings in the four repositories measured were CRAP-only, for functions of cyclomatic complexity 5 to 10. |
| `rules.complexity-file-lines` | `"error"` | The file-length limit below. | Fallow turns the file-length check off until `maxFileLines` is set; with the limit set, an error fails the run like the other complexity rules. |
| `health.maxCyclomatic` | `10` | `lz-audit` step 2, Complexity: cyclomatic complexity is the least number of tests that covers a function's paths, and the complex functions inside hot spots are where the audit reads first. | On lz-gardener, 10 flags 8 functions, all in the top 9 hot-spot files or in the one complex but rarely changed file, and they include four functions behind three of the audit's six design findings (both command-line parsers, the sync loop, and the bed setup in the file that does three jobs). Fallow's default of 20 flags 1 of those by cyclomatic complexity. 11 is the highest value that still flags all four; 10 is the round number below it and adds one function of complexity 11. Measured with Fallow 3.43.2 on other repositories, 10 is the 99.5th percentile of function complexity in four of five (lz-node-test, stryker-playwright-runner, ts-morph and lz-gardener), flagging 0.44 to 0.49% of functions; tldraw is looser (99th percentile 13, 1.5% flagged). A legacy repository adopts the preset through a Fallow baseline, not a raised ceiling. |
| `health.maxFileLines` | `250` | `references/smells.md`, Size limits: a module that holds several jobs is long, and a person who approves code must be able to read it, whoever wrote it. | A file longer than 250 physical lines is flagged. Measured with Fallow 3.43.2 on source files: 250 flags 5.6% of lz-node-test, 4.0% of ts-morph, 14.5% of stryker-playwright-runner and 16.0% of tldraw, and 30% of lz-gardener, where the long script modules are the ones that do several jobs. At 150 to 200 the share rises to 18 to 48% and the extra files are mostly single-purpose; at 300 only one multi-job file in the four established repositories drops out. |
| `health.thresholdOverrides` | `[{"files":["**/*.test.*","**/*.spec.*","**/__tests__/**"],"maxFileLines":0}]` | The file-length limit above, for production code only. | Test files run long for ordinary reasons: 11 to 64% of them exceed 250 lines in the same repositories. `0` turns the file-length check off for matching files; Fallow requires an override that sets `maxFileLines` to leave `functions` empty, and the cyclomatic, cognitive and CRAP limits still apply to test files. The globs are the test-file globs of `eslint-plugin-lz-oop`, without its `**/*.d.ts`. |
| `health.changeCoupling.minDegree` | `0.4` | `references/smells.md`, Shotgun Surgery and Divergent Change: files that change together with no import between them. | Change coupling is advisory: no rule exists for it, so it never fails the run. Measured on pairs with at least 5 shared commits, 0.25 sits below the median degree in lz-node-test (0.34) and stryker-playwright-runner (0.32) and lists most pairs, mostly a file and its own test. 0.4 keeps the strongest third: 32 of 102 pairs in stryker-playwright-runner, 5 of 18 in lz-node-test, 4 in ts-morph (all source files, among them the two runtime adapters that change together), and 10 in lz-gardener, none of them two source files. tldraw still gets 143, mostly release lockstep and sibling tools. |

<!-- preset-values:end -->

## Kept at Fallow's defaults, and why

- `health.maxCognitive` (15): on lz-gardener it flags 3 functions, all among the eight above, so it adds no noise worth
  a change.
- `health.maxCrap` (30): only meaningful with `--coverage` (see above). A higher value would hide real coverage gaps in
  a run that has coverage, and a lower one adds noise to a run that has none.
- Generated code: the preset cannot list it. Set `health.ignore` in your own config for generated files (ts-morph's
  generated type guards were 27 of its 61 functions over the limit) and for vendored or fixture trees.
- `health.maxUnitSize`: `lz-oop`'s class and method length limits and its parameter limit (the Size limits entry of
  `references/smells.md`) stay in ESLint. Fallow cannot hold them: it has no parameter limit, and it lists functions
  over `maxUnitSize` only when at least 3% of all functions are over 60 lines, a list that never fails a run. Only the
  file-length limit, which counts a whole file, is set here.
- `health.changeCoupling.maxFilesPerCommit`, `minRevisions` and `minSharedRevisions` (30, 5, 5): on lz-gardener at
  degree 0.25, lowering the two revision counts to 3 found 5 pairs instead of 3, and both added pairs were test
  utility modules.
- `duplicates`: the default run found one 6-line clone and the `semantic` mode three more, two of them in test
  utilities; none matched an audit finding. `lz-oop` treats duplication as a fact to judge, not a defect to remove
  (`references/duplication-and-abstraction.md`), and Fallow's default `threshold` of 0 never fails a run on the
  duplication percentage.
- Further `health.thresholdOverrides`: exceptions beyond the test-file one belong to the repository that has them.

## What the preset does not change

- `fallow health` exits 1 when it reports any finding. To read the findings without a failing exit code, run it with
  `--report-only`, or set the `complexity-*` rules to `"warn"` in your own config. The preset keeps them at `error`.
- Fallow counts commits per path and does not follow renames, so a file renamed in the window shows less churn than
  `git log --follow` gives. On lz-gardener the three most-changed files showed 68, 66 and 40 commits against 112, 77
  and 58.
- The importer counts (fan-in and fan-out) that mark a file as costly to change are percentiles of your own project;
  no config key sets them.

## Why one preset

A lenient and a strict preset would differ in the limits, and the limits were measured on five repositories (the
cyclomatic and file-length distributions) with one set of values that holds in four of them. There is no measured
second set to back a second preset, so there is one, at least until a measurement says otherwise.
