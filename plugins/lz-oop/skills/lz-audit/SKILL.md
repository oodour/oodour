---
name: lz-audit
description: Object-oriented design audit of a JavaScript or TypeScript package, folder or repository. Use when a developer asks to audit the design of a codebase, find its design hot spots or technical debt, decide where to start refactoring a legacy codebase or which classes or modules to refactor first, or find where change is most expensive (large condition-laden classes, type switches repeated across files, hard-coded dependencies, deep hierarchies, test suites full of mocks). Produces a ranked report and changes nothing. Not for reviewing one change, not for one question about one piece of code, and not for code in other languages.
allowed-tools: Read(${CLAUDE_PLUGIN_ROOT}/**) Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts *)
---

# lz-audit: design audit of a package or repository

This file only routes. Read `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`, and for each smell you report the file
that judging-design.md's step 4 names, before you write the report; the cures and their steps are there, not here. If
those reads are no longer in your context when you write the report, Read them again first.

## 1. Scope and map

Audit what the developer names: a folder, a package, or the whole repository; nothing named means the whole repository.

**When this session wrote or changed code in that scope**, do not audit it here. The session that wrote code judges it
with its own reasons in mind, and an audit is worth most from a reader who has none of them. Launch the `lz-oop:auditor`
agent (the Agent tool, `subagent_type: "lz-oop:auditor"`) with the scope and without your opinion of the code. When it
answers, open the file and lines each finding cites, drop or correct a finding the code does not bear out, and relay the
rest in the shape of step 4, saying that an auditor with fresh context wrote them. If the agent cannot be launched, say
so and audit here. Otherwise, and always inside the `lz-oop:auditor` agent, audit here.

Read the README, the package manifest, the entry points and the test setup. Note where the framework code sits
(controllers, components, handlers) and where the domain code sits, the style of the existing tests, and whether classes
are the house style: where they are not, a cure can use a module of functions or a record of closures to play a role.

## 2. Find the hot spots: churn against complexity

Code that changes often and is hard to understand costs the most; plot each file on those two axes, beside how many
files depend on it.

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts hotspots <scope>`. It measures the last 12 months (`--since <date>`
for another period) and prints 30 rows (`--limit <count>` for more). Lines above the table state the period, the history
and the thresholds; the table has one row per production file:

- **Commits**: commits in the period, a renamed file counted with its old paths. The history line says when a shallow
  clone or a missing repository limits this measure; say so in the report, and say so too when the period is longer than
  the history.
- **Dependents**: the production and test files that import it, by any form of import, path alias or package name,
  counted through files that only re-export it. Files that only re-export are left out of the rows, since their commits
  and dependents belong to the code they pass on.
- **Largest function**: the count ESLint's `complexity` rule gives the file's most complex function. Treat it as a
  fallible fact that starts a judgement, not one that ends it. It is also the least number of tests that covers the
  function's paths, so a hot spot with fewer tests than its count has untested logic; say so in the report. Where the
  repository gates on a mutation score, read that gate for the hot spot's file instead of counting tests: a passing gate
  says more about whether its logic is tested. Where the team sets its own complexity limits (ESLint `complexity`,
  `sonarjs/cognitive-complexity`), judge by them.
- **Concrete classes**: whether the file exports a class that is not abstract, and the concrete classes it names, by
  import or with `new`. The code that changes most should be the easiest to replace, and each concrete class it names
  makes that harder. Where classes are not the house style these columns say little; look instead at the modules whose
  functions a churning file calls directly rather than receiving them.
- **Quadrant**: from thresholds the command sets from the scope itself, which the lines above the table state. They rank
  the files of this scope against each other, so read them as where to look first, not as limits.

When the command cannot run, say why in the report and count by hand: commits per file from
`git log --since="12 months ago" --format= --name-only -- <scope>`, importers by searching the scope's imports for the
file's name, and complexity from the repository's ESLint with the `complexity` rule added on the command line
(`--rule`).

Then weigh the table:

- **Size limits**: Read the Size limits entry under Bloaters in `${CLAUDE_PLUGIN_ROOT}/references/smells.md`, which
  gives the limits for class length, method length, parameter count and controller actions. Apply the team's own limits
  where it has them, else those, and report a file over a limit as a place to look, not as a defect. When nearly every
  function is over a length limit, list only the longest few and every function over the parameter limit; the rest add
  nothing to the ranking.
- **Read the quadrants**:
  - changed and complex: audit these first; a large central class full of conditionals that changes all the time is the
    worst case;
  - depended on: a tenth or more of the production files import it, and it either changes often or exports a concrete
    class, whether or not it is complex. Reading churn as likelihood of change, this is the costly corner of the grid of
    likelihood of change against dependents, and a concrete class with many dependents is suspect even when it has been
    stable. Judge which way its dependencies point rather than its complexity; the cures are in
    `${CLAUDE_PLUGIN_ROOT}/references/dependencies-and-messages.md`, Which way a dependency points. Where classes are
    not the house style, a module whose exported functions hold rules that change belongs here too. A steady abstraction
    that many files depend on is the healthy case, not a finding;
  - complex, seldom changed: usually leave it. Ugly code that nothing depends on, that depends on nothing, and that
    hides behind one message costs nothing until it has to change;
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

- Lead with the hot-spot table from step 2, cut to the rows your findings and the healthy files you name rest on, with
  its lines on the history and the thresholds.
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
  behaviour as small new classes that work with it, even where they look out of place beside it. The big class sends
  messages to them, but receives them injected or built by a factory, so it learns roles rather than more class names,
  and becomes a coordinating class; the cures are in `${CLAUDE_PLUGIN_ROOT}/references/variants-and-conditionals.md`.
- This is a report: leave the audited code unchanged. Scripts you write to measure it, and a report file the developer
  asks for, are fine. A fix the developer then asks for follows the `lz-oop` skill's Shape steps.
