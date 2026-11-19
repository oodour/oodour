---
name: lz-audit
description: Object-oriented design audit of a JavaScript or TypeScript package, folder or repository, based on Sandi Metz's principles and practices. Use when a developer asks to audit the design of a codebase, find its design hot spots or technical debt, decide where to start refactoring a legacy codebase or which classes or modules to refactor first, or find where change is most expensive (large condition-laden classes, type switches repeated across files, hard-coded dependencies, deep hierarchies, test suites full of mocks). Produces a ranked report and changes nothing. Not for reviewing one change, not for one question about one piece of code, and not for code in other languages.
allowed-tools: Read(${CLAUDE_PLUGIN_ROOT}/**)
---

# lz-audit: design audit of a package or repository

This file only routes. Read `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`, and for each smell you report the file
that judging-design.md's step 4 names, before you write the report; the cures and their steps are there, not here. If
those reads are no longer in your context when you write the report, Read them again first.

## 1. Scope and map

Audit what the developer names: a folder, a package, or the whole repository; nothing named means the whole repository.
Read the README, the package manifest, the entry points and the test setup. Note where the framework code sits
(controllers, components, handlers) and where the domain code sits, the style of the existing tests, and whether classes
are the house style: where they are not, a cure can use a module of functions or a record of closures to play a role.

## 2. Find the hot spots: churn against complexity

Code that changes often and is hard to understand costs the most; plot each file on those two axes (Michael Feathers).

- **Churn**: count commits per file over the last year, for example in a POSIX shell
  `git log --since="12 months ago" --format= --name-only -- <scope> | sort | uniq -c | sort -rn`; elsewhere count the
  paths that `git log --format= --name-only` prints in another way. A shallow clone
  (`git rev-parse --is-shallow-repository` prints `true`), a short history, or no Git history at all limits this
  measure: use what exists and say so in the report. Count a moved or renamed file together with its old paths (for
  example `git log --follow --format=%h -- <file>` per file), and leave out a file that now only re-exports others: its
  commits belong to the code that moved out of it.
- **Complexity**: use what the repository already measures (ESLint `complexity`, `max-lines-per-function`,
  `sonarjs/cognitive-complexity`). Where it has ESLint but none of these rules, run its ESLint once with them added on
  the command line (`--rule`) to get real numbers; only without ESLint approximate with file length, function length and
  the number of conditionals. Treat the numbers as fallible facts that start a judgement, not end it. Cyclomatic
  complexity is also the least number of tests that covers a function's paths, so a hot spot with fewer tests than its
  score has untested logic; say so in the report. Where the repository gates on a mutation score, read that gate for the
  hot spot's file instead of counting tests: a passing gate says more about whether its logic is tested.
- **Size limits**: Read the Size limits entry under Bloaters in `${CLAUDE_PLUGIN_ROOT}/references/smells.md`, which
  gives Sandi Metz's limits for class length, method length, parameter count and controller actions. Apply the team's
  own limits where it has them, else those, and report a file over a limit as a place to look, not as a defect. When
  nearly every function is over a length limit, list only the longest few and every function over the parameter limit;
  the rest add nothing to the ranking.
- **Dependents**: for the files high on churn, count how many files import each one. Count production files; say whether
  test files are included, and give both counts when including them changes the ranking. Use what the repository has
  (dependency-cruiser, madge, the Nx project graph, which also sees imports between packages by package name); otherwise
  count the files whose imports name it, for example `rg -l "from ['\"][^'\"]*/<name>(\.[jt]sx?)?['\"]" <scope>` (this
  and the command below are Bash syntax). It counts a file that re-exports the target but not the files that import it
  through that file, and it misses path aliases and imports by package name. A file that changes often and that many
  files depend on is the costly corner of the grid of likelihood of change against dependents, reading churn as
  likelihood of change; it is one input beside concreteness: a concrete class with many dependents is suspect even when
  it has been stable. So also find the most-imported modules with the tools above, or list candidates by file name with
  `rg -o --no-filename -r '$1' "from ['\"]\.[^'\"]*?([^/'\"]+?)(\.[jt]sx?)?['\"]" <scope> | sort | uniq -c | sort -rn`
  (relative imports only; files that share a name, such as `index`, share a line). Take the top five that hold a
  concrete class, or, where classes are not the house style, a module whose exported functions hold rules that change,
  count each one's importers with the `rg -l` command above, and add each that a tenth or more of the files in scope
  import to the hot-spot table as a finding, whatever its churn. The cures for both are in
  `${CLAUDE_PLUGIN_ROOT}/references/dependencies-and-messages.md`, Which way a dependency points.
- **Concrete names in churning files**: for each file high on churn, list the concrete classes it names (its imports and
  `new` calls). The code that changes most should be the easiest to replace, and each concrete class it names makes that
  harder. Where classes are not the house style, list instead the modules whose functions it calls directly rather than
  receiving them, and skip this step when it shows nothing the dependents count has not.
- **Read the quadrants**:
  - often changed and complex: audit these first; a large central class full of conditionals that changes all the time
    is the worst case;
  - many dependents and either changes often or holds concrete code, whether or not it is complex: the costly corner
    from the Dependents bullet; judge which way its dependencies point rather than its complexity. A steady abstraction
    that many files depend on is the healthy case, not a finding;
  - complex but unchanged: usually leave it. Ugly code that nothing depends on, that depends on nothing, and that hides
    behind one message costs nothing until it has to change;
  - simple: skip.

## 3. Judge the hot spots

For the top hot spots, at most about ten, read the code, its callers and its tests, and judge each with
`${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`. Look across files too: the same type switch in several places
(including a `switch` on one union's `kind` field), the same parameters passed together, the same collaborator created
in many classes, two callers that read one result in different ways, and a value written in one module and read back in
another (across a file or process boundary) with nothing that ties the writer to the reader are findings about the
package, not about one file. Use `${CLAUDE_PLUGIN_ROOT}/references/javascript-and-typescript.md` where an idea needs its
JavaScript or TypeScript form.

Before you report a choice as a smell, look for why it was made: an ADR, a comment, or the commit that introduced it
(`git log -S <name>`, `git blame`). A finding that goes against a recorded choice says so and names the record. No
change is in hand in an audit, so where judging-design.md asks which change is likely, answer from churn and the commit
history, not from a guess at features.

## 4. Report

- Lead with the hot-spot table: file, commits in the period, dependents where counted, the complexity measure used, and
  the quadrant.
- Then the findings, ranked by cost: the files and lines, the smell's name, what change it makes expensive, the cure,
  and the first small step. For a hot spot whose logic no test reaches, that first step is characterisation tests
  (`${CLAUDE_PLUGIN_ROOT}/references/javascript-and-typescript.md`, Characterisation tests), before any cure. Group
  findings that share one cure. Leave formatting, lint and naming nits out unless a name hides a concept. Where the cure
  changes a signature or type used across the package, point to the green steps in
  `${CLAUDE_PLUGIN_ROOT}/references/changing-in-steps.md`.
- Say where churn stands in for likely change.
- Say what is healthy and should be left alone, and why.
- Recommend an order of work. Code is opened up for a specific change only once that change has been requested. Without
  a request, use churn and complexity only to rank where general work that loosens coupling pays first, not to guess the
  next feature, and say in the report that this ranking is a judgement.
- For a class in the often-changed and complex quadrant, recommend that it stop growing: build each new piece of
  behaviour as small new classes that work with it, even where they look out of place beside it (Sandi Metz). The big
  class sends messages to them, but receives them injected or built by a factory, so it learns roles rather than more
  class names, and becomes a coordinating class; the cures are in
  `${CLAUDE_PLUGIN_ROOT}/references/variants-and-conditionals.md`.
- This is a report: leave the audited code unchanged. Scripts you write to measure it, and a report file the developer
  asks for, are fine. A fix the developer then asks for follows the `lz-oop` skill's Shape steps.
