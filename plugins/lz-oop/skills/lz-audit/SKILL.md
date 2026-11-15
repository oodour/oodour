---
name: lz-audit
description: Object-oriented design audit of a JavaScript or TypeScript package, folder or repository, based on Sandi Metz's principles and practices. Use when a developer asks to audit the design of a codebase, find its design hot spots or technical debt, decide where to start refactoring a legacy codebase or which classes or modules to refactor first, or find where change is most expensive (large condition-laden classes, type switches repeated across files, hard-coded dependencies, deep hierarchies, test suites full of mocks). Produces a ranked report and changes nothing. Not for reviewing one change, not for one question about one piece of code, and not for code in other languages.
---

# lz-audit: design audit of a package or repository

## 1. Scope and map

Audit what the developer names: a folder, a package, or the whole repository; nothing named means the whole
repository. Read the README, the package manifest, the entry points and the test setup. Note where the framework
code sits (controllers, components, handlers) and where the domain code sits, and how the tests are written.

## 2. Find the hot spots: churn against complexity

Code that changes often and is hard to understand costs the most; plot each file on those two axes (the talk Polly
Want a Message, 2018, credits Michael Feathers for this view).

- **Churn**: count commits per file over the last year, for example in a POSIX shell
  `git log --since="12 months ago" --format= --name-only -- <scope> | sort | uniq -c | sort -rn`; elsewhere count
  the paths that `git log --format= --name-only` prints in another way. A shallow clone
  (`git rev-parse --is-shallow-repository` prints `true`), a short history, or no Git history at all limits this
  measure: use what exists and say so in the report.
- **Complexity**: use what the repository already measures (ESLint `complexity`, `max-lines-per-function`,
  `sonarjs/cognitive-complexity`); otherwise approximate with file length, function length and the number of
  conditionals. Treat the numbers as fallible facts that start a judgement, not end it (Ch.1). Cyclomatic
  complexity is also the least number of tests that covers a function's paths, so a hot spot with fewer tests than
  its score has untested logic; say so in the report (Ch.1).
- **Read the quadrants**:
  - often changed and complex: audit these first; a large central class full of conditionals that changes all the
    time is the worst case (Polly Want a Message, 2018);
  - complex but unchanged: usually leave it. Ugly code that nothing depends on, that depends on nothing, and that
    hides behind one message costs nothing until it has to change (the talk Go Ahead, Make a Mess, Rocky Mountain Ruby 2012);
  - simple: skip.

## 3. Judge the hot spots

For the top hot spots, at most about ten, read the code, its callers and its tests, and judge each with
`${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`. Look across files too: the same type switch in several places,
the same parameters passed together, and the same collaborator created in many classes are findings about the
package, not about one file. Use `${CLAUDE_PLUGIN_ROOT}/references/javascript-and-typescript.md` where a source's
idea needs its JavaScript or TypeScript form.

## 4. Report

- Lead with the hot-spot table: file, commits in the period, the complexity measure used, and the quadrant.
- Then the findings, ranked by cost: the files and lines, the smell's name, what change it makes expensive, the
  cure, and the first small step. Group findings that share one cure. Where the cure changes a signature or type used
  across the package, point to the green steps in `${CLAUDE_PLUGIN_ROOT}/references/changing-in-steps.md`.
- Say what is healthy and should be left alone, and why.
- Recommend an order of work. Code is opened up for a change that has actually been requested (Ch.3); ranking the
  rest by the changes the history suggests will come next is this plugin's judgement, and the report says so.
- This is a report: change nothing. A fix the developer then asks for follows the `lz-oop` skill's Shape steps.

## Sources and attribution

As in the `lz-oop` skill: the book is cited `Ch.<n>`, talks and articles by title and year, and every TypeScript
mapping is this plugin's adaptation.
