# Test-metric reporters: design

Lars, 2026-11-21: "That doesn't matter. As already disccussed, I want consumers to be able to mix and match the metrics
they care about. Multiple metrics detecting issues in the same code is not bad, it's just multiple signals hinting at an
issue and a cure." (decision row of 2026-11-21T14:31:14Z, against Claude's recommendation to ship none).

Research: scratchpad `test-reporters-research.md` (2026-11-21). Everything below marked [inferred] is Claude's design,
not measured.

## Goal

A consumer who does not run Fallow gets the CRAP score from the test run they already have, under Vitest or
`node:test`, with the same cyclomatic count as the `complexity` rule of `@layzee/eslint-plugin-lz-oop`, and can turn it
on beside, or instead of, Fallow's CRAP check.

## Shape [inferred]

One package with three entry points, so the two reporters share one core and one version:

| Entry | What it is |
| --- | --- |
| `.` | The core: per-function coverage in, CRAP scores and the report out. No runner types. |
| `./vitest` | A Vitest reporter class: `onCoverage(coverage: unknown)` parses the Istanbul coverage map (checked at the boundary, since Vitest types it `unknown`), joins statements to each `fnMap` range. |
| `./node-test` | A `node:test` reporter (async generator over events): on `test:coverage`, joins `lines[]` to each function's range, zero for a function whose call count is 0. |

- Complexity and function ranges: run ESLint's own `complexity` rule through `Linter` with `max: 0` over each covered
  file and read each report's descriptor before ESLint turns it into a message. The descriptor carries the function
  node itself (`node`, with its full range) beside the head `loc` and `data.complexity` (ESLint v10.13.0
  `lib/rules/complexity.js`, the `context.report` call) [source], the same interception `wrapRule` in the ESLint plugin
  already does. So the count is the lint rule's by construction, and no second counter needs a differential test.
  Class field initializers and static blocks report too, as the rule's own implicit functions.
- Score: CRAP = c^2 * (1 - coverage)^3 + c, coverage as a fraction of the function's statements (Vitest) or lines
  (`node:test`). The README says the two runners can differ slightly for that reason.
- Limit: 30 by default (Fallow's `maxCrap` default, which the Fallow preset keeps), an option. Over the limit: one line
  per function with file, line, name, complexity, coverage and score, and `process.exitCode = 1`.
- Message: a stop-and-look message like the lint rules', concept and cure from the plugin's references (the CRAP
  check already traces to ADR 0003's metric exception).
- Bar: erasable TypeScript, tests on Node.js 22 and 24 in `node --test`, Stryker at the checkpoint, a README with the
  limit measured on the same repositories as the Fallow preset, a glossary entry if a new word appears, ATTRIBUTION
  unchanged (no new source).

## Decided

1. Package name: `@layzee/lz-oop-test-metrics`. Lars, 2026-11-21, 16:30 local: "The `-lz-oop` suffix was to align with
   Fallow conventions. Other package should use an `lz-oop-` prefix unless their ecosystems' conventions say
   otherwise." Neither Vitest's reporter docs nor Node.js's test runner docs name a convention for reporter packages
   (Claude checked the local clones), so the prefix applies; "test-metrics" is Claude's choice, named for metrics rather
   than CRAP so later columns fit without a rename.
2. The two extra columns (public methods no test called; uncovered branches per function) ship as columns, not gates,
   in the first version. Lars, 2026-11-21: "The two extra columns: OK", on Claude's recommendation. Origin under
   ADR 0003, from two oracle answers on 2026-11-21 (Claude's summary in its own words):
   - Both columns are instances of the smell **Untested Code** (Meszaros, Ch.17, a cause of the project smell
     Production Bugs; Ch.14 on testing the alternative paths a function takes). Cures there: stubs that drive each
     path's inputs, or a design change that makes the code testable. Its warning is against a target on the number of
     tests, so a column that signals and does not gate fits.
   - Uncalled public methods: POODR Ch.9 says to test the messages an object receives by their result, to leave
     messages it sends to itself untested, and to delete a public method no object sends. So the column counts public
     methods only (not `#private` or TypeScript `private`), charges an untested query to the class that answers it,
     and its message names two cures: a test of the method's result, or deleting a method nothing sends. POODR says
     nothing on branch coverage; Ch.1 treats design metrics as proxies, which supports columns over gates.
   - "Called" proves less than "tested": a role test can check that a method exists without calling it, and a mock
     keeps the real code from running. The README says so.
3. Shape of the two columns: separate stop-and-look lines that never fail the run (only CRAP lines set the exit code),
   each signal switchable, all on by default. Lars, 2026-11-21, 18:16 local: "What the \"two extra columns\" look like:
   OK", on Claude's option (B) over (A), extra fields on the CRAP lines.

## Steps

1. Spike the join (riskiest unknown first): the `complexity` rule's node ranges against Vitest's `fnMap` ranges and
   `node:test`'s function start lines on one fixture, for arrow functions, methods, class fields and nested functions.
   Measured 2026-11-21 in `D:/tmp/lz-oop-reporter-spike` (Vitest 5.1.0 with `@vitest/coverage-v8`, Node.js 24.22.0, a
   TypeScript fixture):
   - Vitest's `fnMap` lists declarations, arrows (named after their variable), methods, getters, nested arrows and the
     default export, each with a hit count. `decl` points at the name; `loc.start` is the first position of the body
     (`{`, or the expression of an expression-bodied arrow, without its parentheses), which is ESLint's
     `node.body.loc.start`. Join key: the body's start line and column. Class field initializers and static blocks have
     no `fnMap` entry, so the Vitest reporter cannot score them.
   - `node:test`'s `test:coverage` event gives each function's name, first line and call count, including
     `<instance_members_initializer>` and `<static_initializer>`, and branches by line only, with no link to a function.
     Join key: the function node's first line, with the name to tell apart two functions on one line; two anonymous
     functions on one line stay ambiguous and are reported once, merged. Uncovered branches per function: branches whose
     line falls inside the function's lines and outside its nested functions.
   - Still to check: ESLint's report positions on the same fixture (step 2 starts with that test).
2. Core, test-first (lz-tdd): score, limit, report lines.
3. Vitest reporter with a fixture project under Vitest 5 (both coverage providers).
4. `node:test` reporter with a fixture under Node.js 22 and 24, `--experimental-test-coverage`.
5. README with measured limits; Nx project; `npm run check` covers it.
6. Stryker checkpoint, review round, then Lars's go-ahead for anything outward.
