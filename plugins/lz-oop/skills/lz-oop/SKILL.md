---
name: lz-oop
description: Object-oriented design coach for JavaScript and TypeScript, based on Sandi Metz's principles and practices. Use when a developer is about to write or change classes, objects or modules and asks how to shape them; when a new requirement lands on existing object-oriented code and they ask where it should go; when they ask whether to DRY up, merge or extract code that looks alike; when they ask for a design review of existing code (dependencies, responsibilities, conditionals that pick behaviour, inheritance versus composition, duplication, naming); when they ask how to unit-test a class's messages (what to assert, which collaborators to mock, why tests break on every refactoring); or when they ask what a design principle, smell or pattern means for their code. Not for choosing the next failing test or making a failing test pass, and not for code in other languages.
---

# lz-oop: object-oriented design coach

## Classify the request first

1. **Shape**: code that is about to be written, or existing code that must change for a new
   requirement.
2. **Review**: the design of code that exists, with no change requested yet.
3. **Tests**: how to test an object's messages, or why its tests are hard to write.
4. **Explain**: what a principle, smell or pattern means, for this code or in general.
5. **Not a design question**: a bug, a rename, a request to write or pass a test, functional code
   where objects would not help, or another language. Answer it directly without this skill's
   procedures.

Inspect the project before advising: its language and module style, framework conventions, and how
its existing code and tests are written. Advice must fit the codebase, including codebases where
classes are not the house style: a module of functions or a record of closures can play a role as
well as a class can.

Advise on a question; change code only on an explicit request to do so, then stop.

## Shape: new code, or code that must change

1. Pin down what the requirement asks for, and build nothing it does not ask for.
2. New code: start with the plainest version that passes its tests and reads clearly, and keep its
   duplication until the abstraction is plain to see. Stop there if nothing is going to change
   (Shameless Green, Ch.1 and Ch.2).
3. A change to existing code is two separate jobs (Ch.3; the article Getting It Right By Betting On
   Wrong, 2014, which credits the idea to Kent Beck). First ask whether the code is already open to
   this change. If it is, add the change. If it is not, first restructure it, with the tests green
   and unchanged, until the change is easy; then add the change, test-first.
4. Restructure in small steps, with a test run between every two of them. Undo a step that turns
   the suite red and take a smaller one. Never rewrite the whole class in one go (Ch.3).
5. Look at the shape of the change and open the matching leaf:
   - a new kind of thing that a conditional switches on, or a flag argument that steers shared
     code: [references/variants-and-conditionals.md](references/variants-and-conditionals.md);
   - shared code that callers keep bending with parameters, or duplication you are tempted to
     remove: [references/duplication-and-abstraction.md](references/duplication-and-abstraction.md);
   - a collaborator created or reached for inside the class, or a chain of calls through other
     objects: [references/dependencies-and-messages.md](references/dependencies-and-messages.md).

## Review: existing design

1. Judge the code by what it costs to change, not by how it looks or by a metric alone. Ask what
   change is likely, and what this design would make that change cost.
2. Name each smell you see, in the vocabulary of named smells and refactorings, and pair it with
   its usual cure. Rank them; the easiest well-understood one goes first.
3. Say plainly when the design is fine. A conditional that only chooses which object to create, a
   shallow inheritance tree whose subclasses use all of what they inherit (conditions from the talk
   All the Little Things, 2014; see the inheritance leaf), and some
   duplicated lines that may still diverge are often the right call. Support that verdict with the
   specific properties of this code.
4. Open the leaf for the smell:
   [variants and conditionals](references/variants-and-conditionals.md),
   [duplication and abstraction](references/duplication-and-abstraction.md),
   [dependencies and messages](references/dependencies-and-messages.md),
   [inheritance](references/inheritance.md).

## Tests: what to assert for an object's messages

Open [references/testing-messages.md](references/testing-messages.md). Treat a test that is hard to
write as news about the design, and say what in the design causes it.

## Explain

Answer from the leaf that covers the idea, tied to the developer's code where there is code. Say
where the idea comes from, and keep what this skill adds apart from what its sources say.

## Sources and attribution

Ideas credited to Sandi Metz come from Metz, Owen and Stankus, *99 Bottles of OOP*, 2nd edition,
JavaScript (cited `Ch.<n>`), and from her talks and articles (cited by title and year). Every text in
this skill is written in its own words. The sources give no TypeScript-specific guidance: each TypeScript
mapping in the leaves is this skill's inference and is marked so.
