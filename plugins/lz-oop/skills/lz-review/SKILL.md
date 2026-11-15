---
name: lz-review
description: Object-oriented design review of a change in JavaScript or TypeScript, based on Sandi Metz's principles and practices. Use when a developer asks for a design review of a diff, uncommitted or staged changes, a commit, a branch or a pull request, or asks whether a change made the code harder to change next time (new branches on a type switch, flag arguments, hard-coded collaborators, message chains, inheritance, tests that mock too much). Reports findings ranked by what they will cost later; changes nothing unless asked. Not for one question about one piece of code, not for auditing a whole package, and not for code in other languages.
---

# lz-review: design review of a change

## 1. Scope

Review what the developer names: uncommitted or staged changes, a commit, a branch against its base, or a pull
request. When nothing is named, review the uncommitted changes, or the last commit if there are none.

## 2. Read the change and what it touches

Read the diff, then the code around it: the callers of each changed function or class, the collaborators it now
uses, and the tests that cover it. A change can raise the cost of code it does not touch, such as every other place
that switches on the same kind.

## 3. Look for what the change does to the next change

For each changed area, ask:

- **Two jobs in one?** Did the change restructure and add behaviour in the same step? Restructuring with tests green
  and unchanged, then adding the behaviour, is the safer order (Ch.3).
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
  That points to tests that check how rather than what, or to a behaviour change hidden in the commit (Ch.3):
  `${CLAUDE_PLUGIN_ROOT}/references/testing-messages.md`.

Judge each candidate finding with `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md`, and use
`${CLAUDE_PLUGIN_ROOT}/references/javascript-and-typescript.md` where a source's idea needs its JavaScript or
TypeScript form.

## 4. Report

- Rank findings by how much the change raises the cost of likely future changes, most first. Say which future change
  each finding makes expensive.
- For each finding: file and lines, the smell's name, the cure, and the first small step toward it, with a short
  TypeScript sketch where it helps.
- Say plainly what the change did well and what is fine as it is, with the properties that make it fine.
- Leave formatting, lint and naming nits out unless a name hides a concept.
- Change no code unless the developer asks; then make the smallest step, run the tests, and stop.

## Sources and attribution

As in the `lz-oop` skill: the book is cited `Ch.<n>`, talks and articles by title and year, and every TypeScript
mapping is this plugin's adaptation.
