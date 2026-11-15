---
name: lz-oop
description: Object-oriented design coach for JavaScript and TypeScript, based on Sandi Metz's principles and practices. Load it first, before reading any code, when a developer asks where a new requirement, feature or variant should go in existing code or how to fit it in; how to change a function or method that many callers use in small safe steps; how to shape classes, objects or modules; whether to DRY up or extract code that looks alike; whether one file, class or module is well designed (dependencies, conditionals, inheritance, duplication); which test to write next while working test-first, or the smallest change that makes a failing test pass; how to unit-test a class's messages (what to assert, what to mock, why tests break on every refactoring); or what a design principle, smell or pattern means for their code. Not for reviewing a change set or auditing a package, and not for other languages.
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

This file only routes. Before you answer, Read each reference file the matching section below names for the
request, and every further reference that file sends you to for the smell or practice at hand: the steps, the
exceptions and the sources are there, not here. An answer written from this file alone is incomplete.

## Shape: new code, or code that must change

1. Pin down what the requirement asks for, and build nothing it does not ask for.
2. Name the shape of the change and open the matching leaf:
   - a new kind of thing that a conditional switches on, or a flag argument that steers shared code:
     `${CLAUDE_PLUGIN_ROOT}/references/variants-and-conditionals.md`;
   - shared code that callers keep bending with parameters, or duplication you are tempted to remove:
     `${CLAUDE_PLUGIN_ROOT}/references/duplication-and-abstraction.md` (also for naming a new concept, section
     Naming);
   - a collaborator created or reached for inside the class, or a chain of calls through other objects:
     `${CLAUDE_PLUGIN_ROOT}/references/dependencies-and-messages.md`;
   - a class hierarchy to add to or replace: `${CLAUDE_PLUGIN_ROOT}/references/inheritance.md`;
   - a raw number, string or boolean that stands for a domain idea and gets passed around:
     `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`, section Primitive Obsession.
3. New code: start with the plainest version that passes its tests and reads clearly, and keep its duplication until
   the abstraction is plain to see. Stop there if nothing is going to change (Shameless Green, from
   *99 Bottles of OOP*).
4. A change to existing code is two separate jobs (the book; the article Getting It Right By Betting On Wrong, 2014,
   which credits the idea to Kent Beck). Follow the book's Open/Closed path each time a requirement lands:
   1. Can the change go in without editing the code that is there? Then add it, test-first.
   2. If not, and you can see how to make it open, restructure first, with the tests green and unchanged, until the
      change is easy; then add the change, test-first.
   3. If you cannot see how, remove the easiest well-understood smell, run the tests, and ask step 1 again. A way to
      open the code tends to appear as the smells go; keep an improvement even when the code is still closed
      (the book). To choose which smell to start on, sketch in a comment the conditional the change would need;
      the smells it would create (Switch Statement, Long Function) point at the cure, then delete the sketch (the book).

   The path is done when the change itself went in as an addition and the tests that pinned the old behaviour never changed.
5. Restructure in small steps, with a test run between every two of them. Undo a step that turns the suite red and
   take a smaller one. Never rewrite the whole class in one go (the book). To change a signature, a parameter or a
   return type across its senders in such steps, use `${CLAUDE_PLUGIN_ROOT}/references/changing-in-steps.md`.

Answer with the recommended structure, the first small step, and the test that drives it. Stop there unless the
developer asked you to change the code.

## Judge: one piece of existing code

Follow `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`. It gives the verdict and names each smell, and its step 4
names the reference file that holds each smell's cure; it does not hold those cures itself. Open that file for every
smell you report before you recommend a cure.

## Tests

- Writing code test-first, or choosing the next test: `${CLAUDE_PLUGIN_ROOT}/references/test-first.md`.
- Tests that break whenever the code is restructured: `${CLAUDE_PLUGIN_ROOT}/references/test-first.md`, section
  Tests while restructuring, and `${CLAUDE_PLUGIN_ROOT}/references/testing-messages.md` (next bullet).
- What to assert for an object's messages, doubles, and tests that are hard to write:
  `${CLAUDE_PLUGIN_ROOT}/references/testing-messages.md`. Treat a test that is hard to write as news about the
  design, and say what in the design causes it.
- Keeping a fake or other player of a role honest with one shared test, and writing that test in Vitest, Jest or
  `node:test`: `${CLAUDE_PLUGIN_ROOT}/references/javascript-and-typescript.md`, section Role tests.

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

Ideas credited to Sandi Metz come from Metz, Owen and Stankus, *99 Bottles of OOP*, 2nd edition, JavaScript
(credited by title, its practices by name), from the publisher's sample chapter of her *Practical Object-Oriented
Design*, 2nd edition, and from her talks and articles (cited by title, with the year where it
is known); ideas credited to Katrina Owen come from her talks (cited the same way). Every text in this plugin is
written in its own words. This plugin takes no TypeScript guidance from its sources: each TypeScript mapping is its
own adaptation and is marked so.
