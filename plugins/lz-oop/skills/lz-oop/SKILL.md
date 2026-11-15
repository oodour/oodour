---
name: lz-oop
description: Object-oriented design coach for writing and changing JavaScript and TypeScript code, based on Sandi Metz's principles and practices. Use when a developer is about to write or change classes, objects or modules and asks how to shape them; when a new requirement lands on existing code and they ask where it should go; when they ask whether to DRY up or extract code that looks alike; when they ask whether one file, class or module is well designed or ask to review its design (dependencies, conditionals, inheritance, duplication); when they write code test-first, ask which test to write next or for the smallest change that makes a failing test pass, or ask how to unit-test a class's messages (what to assert, what to mock, why tests break on every refactoring); or when they ask what a design principle, smell or pattern means for their code. Not for reviewing a change set or auditing a package, and not for other languages.
---

# lz-oop: object-oriented design coach

## Classify the request first

1. **Shape**: code that is about to be written, or existing code that must change for a new
   requirement.
2. **Judge**: whether one piece of existing code is well designed, with no change requested yet.
3. **Tests**: writing code test-first, choosing the next test, or how to test an object's messages.
4. **Explain**: what a principle, smell or pattern means, for this code or in general.
5. **Not a design question**: a bug, a rename, functional code where objects would not help, or
   another language. Answer it directly without this skill's procedures.

A review of a whole change set (a diff, a branch, a pull request) belongs to the `lz-review` skill, and an audit of
a package or repository to the `lz-audit` skill.

Inspect the project before advising: its language and module style, framework conventions, and how its existing code
and tests are written. Advice must fit the codebase, including codebases where classes are not the house style: a
module of functions or a record of closures can play a role as well as a class can.

Advise on a question; change code only on an explicit request to do so, then stop.

## Shape: new code, or code that must change

1. Pin down what the requirement asks for, and build nothing it does not ask for.
2. Name the shape of the change and open the matching leaf:
   - a new kind of thing that a conditional switches on, or a flag argument that steers shared code:
     `${CLAUDE_PLUGIN_ROOT}/references/variants-and-conditionals.md`;
   - shared code that callers keep bending with parameters, or duplication you are tempted to remove:
     `${CLAUDE_PLUGIN_ROOT}/references/duplication-and-abstraction.md`;
   - a collaborator created or reached for inside the class, or a chain of calls through other objects:
     `${CLAUDE_PLUGIN_ROOT}/references/dependencies-and-messages.md`;
   - a class hierarchy to add to or replace: `${CLAUDE_PLUGIN_ROOT}/references/inheritance.md`.
3. New code: start with the plainest version that passes its tests and reads clearly, and keep its duplication until
   the abstraction is plain to see. Stop there if nothing is going to change (Shameless Green, Ch.1 and Ch.2).
4. A change to existing code is two separate jobs (Ch.3; the article Getting It Right By Betting On Wrong, 2014,
   which credits the idea to Kent Beck). First ask whether the code is already open to this change. If it is, add
   the change. If it is not, first restructure it, with the tests green and unchanged, until the change is easy;
   then add the change, test-first.
5. Restructure in small steps, with a test run between every two of them. Undo a step that turns the suite red and
   take a smaller one. Never rewrite the whole class in one go (Ch.3).

Answer with the recommended structure, the first small step, and the test that drives it. Stop there unless the
developer asked you to change the code.

## Judge: one piece of existing code

Follow `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`.

## Tests

- Writing code test-first, or choosing the next test: `${CLAUDE_PLUGIN_ROOT}/references/test-first.md`.
- Tests that break whenever the code is restructured: `${CLAUDE_PLUGIN_ROOT}/references/test-first.md`, section
  Tests while restructuring, and `testing-messages.md` (next bullet).
- What to assert for an object's messages, doubles, and tests that are hard to write:
  `${CLAUDE_PLUGIN_ROOT}/references/testing-messages.md`. Treat a test that is hard to write as news about the
  design, and say what in the design causes it.

## Explain

Answer from the leaf that covers the idea, tied to the developer's code where there is code. Say where the idea comes
from, and keep what this plugin adds apart from what its sources say. When no leaf covers the idea, say so, answer in
general terms, and credit nothing to Sandi Metz or Katrina Owen.

## JavaScript and TypeScript

Where an idea from the sources does not carry over to JavaScript or TypeScript as stated, use the equivalent in
`${CLAUDE_PLUGIN_ROOT}/references/javascript-and-typescript.md`. Write TypeScript by default, in syntax that Node.js
can strip (no `enum`, `namespace` or constructor parameter properties), and add a JavaScript note where the
languages differ.

## Sources and attribution

Ideas credited to Sandi Metz come from Metz, Owen and Stankus, *99 Bottles of OOP*, 2nd edition, JavaScript (cited
`Ch.<n>`), and from her talks and articles (cited by title, with the year where it is known); ideas credited to Katrina Owen
come from her talks (cited the same way). Every text in this plugin is written in its own words. This plugin takes no
TypeScript guidance from its sources: each TypeScript mapping is its own adaptation and is marked so.
