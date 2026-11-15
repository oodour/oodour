---
name: lz-review
description: Object-oriented design review of a change in JavaScript or TypeScript, based on Sandi Metz's principles and practices. Use when a developer asks for a design review of a diff, uncommitted or staged changes, a commit, a branch or a pull request, or asks whether a change made the code harder to change next time (new branches on a type switch, flag arguments, hard-coded collaborators, message chains, inheritance, tests that mock too much). Reports findings ranked by what they will cost later; changes nothing unless asked. Not for the design of one file, class or module as it stands (a change, not a file), not for auditing a whole package, and not for code in other languages.
---

# lz-review: design review of a change

## 1. Scope

Review what the developer names: uncommitted or staged changes, a commit, a branch against its base, or a pull
request. When nothing is named, review the uncommitted changes, or the last commit if there are none.

## 2. Read the change and what it touches

Read the diff, then the code around it: the callers of each changed function or class, the collaborators it now
uses, and the tests that cover it. A change can raise the cost of code it does not touch, such as every other place
that switches on the same kind. For a large change, rank the changed areas by how many places depend on them, read
the top ones first, and say in the report which areas were not read.

## 3. Look for what the change does to the next change

For each changed area, ask:

- **Two jobs in one?** Did the change restructure and add behaviour in the same step? Restructuring with tests green
  and unchanged, then adding the behaviour, is the safer order (*99 Bottles of OOP*). What a restructure may do to
  tests: `${CLAUDE_PLUGIN_ROOT}/references/test-first.md`, section Tests while restructuring.
- **A second responsibility for a class or method?** Did the change give a class or method a job beyond the one it
  had: a new topic after a blank line, a loop now also doing the work for each item, a method that uses only some
  fields? Not the same as the question above, which is about the steps of the change, not what the code now does:
  `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`, check Does it do one job?
- **A new branch on a kind?** A new `case` or `else if` for a kind that other methods also switch on means the next
  kind costs the same edits again: `${CLAUDE_PLUGIN_ROOT}/references/variants-and-conditionals.md`.
- **A new flag or parameter on shared code?** Shared code gaining a boolean or a mode for one caller is the usual
  path to a wrong abstraction: `${CLAUDE_PLUGIN_ROOT}/references/duplication-and-abstraction.md`.
- **Duplication removed or added?** Judge it by the concept, not by matching text, and by whether a change request
  is driving it (same leaf).
- **A collaborator created inside the class, or a new chain through other objects?**
  `${CLAUDE_PLUGIN_ROOT}/references/dependencies-and-messages.md`.
- **A new subclass or a deeper hierarchy?** `${CLAUDE_PLUGIN_ROOT}/references/inheritance.md`.
- **Tests:** do the new or changed tests assert what the code does through its public messages, leave outgoing
  queries unverified, and expect outgoing commands? Did tests change in a commit that claims to only restructure?
  That points to tests that check how rather than what, or to a behaviour change hidden in the commit (the book):
  `${CLAUDE_PLUGIN_ROOT}/references/testing-messages.md`.

Judge each candidate finding with `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`, and use
`${CLAUDE_PLUGIN_ROOT}/references/javascript-and-typescript.md` where a source's idea needs its JavaScript or
TypeScript form.

This file only routes. Before you report a finding, Read the reference its question above names, and the file
judging-design.md sends you to for its smell: the cure, its steps and its exceptions are there, not here. A
finding written from this file alone is incomplete.

## 4. Report

- A finding is something this change did that makes a change harder: a new branch, flag, hard-coded collaborator,
  chain or subclass, or a test that checks how rather than what. Rank findings by how much each raises that cost,
  most first, and say which change each makes expensive.
- A new object, collaborator or abstraction for a requirement nobody has asked for is not a finding. *99 Bottles of OOP*
  waits for the actual change request, which shows the shape the code needs, and treats an unforced change to working
  code as a bet. At most, name it in one line as what to reconsider when that request arrives.
- The book also counts some unforced changes as bets always worth taking: those that loosen coupling (behaviour on
  instances, collaborators injected as roles, objects created at the edges, no chains through other objects),
  because change will come where no one can predict. A change of that kind is a strength to name, not a
  finding.
- Indirection the change adds without need is a finding: a layer, wrapper or general method that no current caller
  needs makes the code harder to read and no cheaper to change, and an early wrong abstraction can hide the right one
  (the book). Name what the simpler form would be.
- When the change raised no cost, say it is sound, say why, and stop.
- For each finding: file and lines, the smell's name, the cure, and the first small step toward it. Where a sketch
  helps, sketch that first step in TypeScript (one new object, one table entry), not the finished design. Where the
  cure changes a signature many callers use, give the green steps from
  `${CLAUDE_PLUGIN_ROOT}/references/changing-in-steps.md`.
- Say plainly what the change did well and what is fine as it is, with the properties that make it fine.
- Leave formatting, lint and naming nits out unless a name hides a concept.
- Change no code unless the developer asks; then make the smallest step, run the tests, and stop.

## Sources and attribution

As in the `lz-oop` skill: the book is credited by title and its practices by name, talks and articles by title and
year, and every TypeScript mapping is this plugin's adaptation.
