# @layzee/lz-oop-test-metrics

Vitest and `node:test` reporters that read the coverage of a test run and point at untested code, one function at a
time. Each run checks three signals:

- **CRAP score**: a function's path count, raised steeply by the share of it no test runs. A function whose score
  reaches the limit fails the run.
- **Public methods no test called**: a method other objects may send, with no test that sends it.
- **Branch paths no test took**: in a function the tests did call, the paths of its own branches that no test took.

Each signal prints a stop-and-look message on one line, led by the function's file and line so that editors and
terminals link to it. It names the concept, Untested Code, what it found and the cure. Only CRAP lines fail the run. The other two are pointers to read, not gates.

The path count is the one that the `complexity` rule of ESLint counts, so it matches the `complexity` rule of
`eslint-plugin-lz-oop`. The reporters run that rule on each covered file themselves.

The package is private and unpublished for now. Measured with Vitest 5.1.0 (both coverage providers), Node.js 22.23.1
and 24.22.0, and ESLint 10.13.0.

The package ships its TypeScript source, and Node.js refuses to strip types from a file under `node_modules`. An
installed copy stops with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, so for now import the reporters by path from a
checkout of this repository, as the examples below do.

## Use it with Vitest

Add the reporter beside your usual one and turn coverage on. The `v8` and `istanbul` providers both work. The reporter
reads the coverage that Vitest holds in memory, so the coverage `reporter` list can stay empty.

```ts
import { defineConfig } from 'vitest/config';
import { TestMetricsReporter } from './path/to/lz-oop/packages/lz-oop-test-metrics/src/vitest.ts';

export default defineConfig({
  test: {
    coverage: { enabled: true, provider: 'v8', include: ['src/**/*.ts'], reporter: [] },
    reporters: ['default', new TestMetricsReporter({ limit: 30 })],
  },
});
```

Keep `coverage.include` to JavaScript and TypeScript files. The reporter parses each covered file, and a file it cannot
parse, such as a `.vue` file, stops the report with the parse error.

## Use it with `node:test`

Run the tests with coverage and add the reporter beside your usual one. Each reporter needs its own destination:

```sh
node --test --experimental-test-coverage \
  --test-reporter=spec --test-reporter-destination=stdout \
  --test-reporter=./path/to/lz-oop/packages/lz-oop-test-metrics/src/node-test.ts --test-reporter-destination=stdout
```

A `node:test` reporter module takes no options, so the module above runs with the defaults. For other options, export
a reporter of your own from a module and name that module in `--test-reporter`:

```ts
import { createTestMetricsReporter } from './path/to/lz-oop/packages/lz-oop-test-metrics/src/node-test.ts';

export default createTestMetricsReporter({ limit: 20, uncalledPublicMethods: false });
```

On Windows, give a reporter named by an absolute path as a `file:///` URL. Node.js refuses a bare drive path there.

## Options

Both reporters take the same options. Every option is optional.

| Option                  | Default | What it does                                                                               |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `limit`                 | `30`    | The CRAP score at which a function is reported and fails the run. Fallow uses 30 too.      |
| `crap`                  | `true`  | Report functions whose CRAP score reaches the limit. With `false`, no run fails.           |
| `uncalledPublicMethods` | `true`  | Report each public method no test called.                                                  |
| `untestedBranches`      | `true`  | Report each function a test called that has branch paths no test took.                    |

## What a run prints

The lines come per function, in the order the coverage lists the functions, with the CRAP line first. From the
package's own fixture, a run at limit 6 prints:

```text
src/order.ts:13 Stop and look: Untested Code, Function 'classify' scores CRAP 12 (limit 6): 3 paths, 0% of it run by tests. Look for the paths no test takes. Cure: a test that drives each of them through the inputs, or fewer paths first (Decompose Conditional, Replace Conditional with Polymorphism) when those inputs are hard to set up.
src/order.ts:26 Stop and look: Untested Code, Method 'open' is public and no test called it. Look for what sends it. Cure: a test that sends it and checks what it returns or the message it passes on, or delete it when nothing sends it.
src/order.ts:30 Stop and look: Untested Code, Method 'charge' has 1 branch path no test took. Cure: a test that drives it through the inputs that reach it.
```

The run exits with code 1 because of the CRAP line. Without it, the same run exits with code 0.

A public method is a method, getter or setter of a class, other than the constructor, `#private` members, and members
that TypeScript marks `private` or `protected`. A test checks such a method through the result it returns or the
change it makes, so a method no test sends is untested, and one that nothing sends at all can go.

A function that no test called gets no branch line. Its CRAP score already counts every path in it as untested.

## How often each signal fires

Measured at the defaults with the `node:test` reporter on Node.js 24.22.0. Each project's own `test` target ran with
coverage of that project's source files, test files and fixtures left out. Every repository tests well: 97% of its
functions ran in at least one test.

| Repository                                       | Functions | CRAP lines at 30 | Uncalled public methods | Branch lines |
| ------------------------------------------------ | --------- | ---------------- | ----------------------- | ------------ |
| lz-gardener (`6c2401c`, 3 projects)              | 1,055     | 4 (0.4%)         | 0 of 0                  | 69 (6.7%)    |
| lz-node-test (`aa3bc1b`, 8 projects)             | 823       | 4 (0.5%)         | 4 of 8                  | 31 (3.9%)    |
| stryker-playwright-runner (`f39d8ac`, 11 projects) | 1,668   | 6 (0.4%)         | 3 of 22                 | 71 (4.4%)    |

The branch share counts the functions a test called, since only those get a branch line.

- **CRAP at 30** gives about one line per 200 functions, so a failed run points at a few functions. A limit of 20
  gives 0.5 to 0.9%, and a limit of 10 gives 2.3 to 2.9%.
- **Uncalled public methods** depend on how much code sits in classes. lz-gardener has no public class methods. In
  lz-node-test, all four sit on one class that its separate `test-integration` target runs, and that target was not
  part of the measurement. So a line says what the measured tests leave out, not what no test anywhere covers.
- **Branch lines** fire most: one for every 15 to 26 called functions. They are the signal to switch off first when
  a run prints more than a team reads.

ts-morph, the fourth repository the Fallow preset was measured on, runs its tests with mocha under Deno, so neither
reporter runs there. One test in lz-node-test fails under `--experimental-test-coverage` alone, with no reporter
added: it formats `NaN` and expects `-NaN`.

## A called function is not a tested one

Coverage records that a test ran a function, not that a test checked what it did. A test that calls a method and
asserts nothing counts as a call. A test that puts a stand-in in place of a collaborator keeps the collaborator's code
from running, so that code stays uncalled. Read each line as a place to look, not as proof either way, and never
write a test to make a line go away: a test that checks nothing removes the line and leaves the code untested.

## Why the two runners can disagree

The two runners measure coverage in different units, so one function can get different numbers from each:

- **Share run.** Vitest's coverage counts statements, and `node:test` counts lines. A line that holds two statements
  counts once under `node:test`.
- **Branch paths.** Vitest's coverage lists each branch with a count per path, so an `if` without an `else` has two
  paths. `node:test` lists the blocks of code that ran a different number of times than the block around them, with no
  total. On the fixture, both count one untaken path in `charge`. On other code the counts can differ. `node:test`
  gives a block its line but no column, so an untaken block on the line where a callback starts inside a function's
  first line counts for both functions. V8 lists no blocks inside a function that never ran, so under `node:test` an
  untaken block on the lines of a function no test called belongs to the called function around it, and counts for
  that function. `node:test` keeps the blocks on the lines that a `node:coverage ignore` comment covers, by their first
  line only. The reporter counts no block whose first two lines the comment covers, so an untaken one-line block
  under the comment still counts.
- **Which functions.** Each reporter scores the functions that its coverage lists. With the `v8` provider, Vitest's
  coverage lists no class field initializers and no static blocks. With the `istanbul` provider, it lists no `#private`
  methods. `node:test` coverage gives a class's instance field initializers one count for the whole class, and its
  static field initializers and static blocks another, so the `node:test` reporter scores none of them. It scores
  static methods. Under both runners, a function that a coverage ignore comment
  covers is left out.

The first line of a function in `node:test` coverage also holds what ran around the function, such as the `export`
that ran when the module loaded. The reporter counts a function that no test called as 0% run, whatever its first line
shows.
