# Variants and conditionals

Use when a conditional switches on a kind, type or status, when a new kind has to be added, or when a
boolean or string argument steers what shared code does.

## Choosing versus doing

Sort each conditional into one of two groups (Ch.5 and Ch.6; the talk Polly Want a Message, 2018).

- **It chooses which object to use.** One conditional that maps a kind to an object is fine, and some
  such choice is unavoidable. Keep it.
- **It does the work for each kind.** Branches that compute, format or decide something per kind
  mean an object per kind is missing. Every new kind adds a branch here and in each place that
  switches on the same value.

## Adding a kind when the code switches on kinds

1. Restructure first, as SKILL.md step 3 says; the new kind comes after.
2. Give each kind its own object (a class, or a module or object literal where that is the house
   style). Every one of them answers the same messages, so a caller sends the message and never asks
   which kind it holds (Ch.6).
3. Put the choice in one place, a factory: the only code that knows the concrete kinds and how to
   pick one. Move object creation into a single method first; that method becomes the factory. No
   other code repeats the choice (Ch.6; Polly Want a Message, 2018).
4. Move the branches one kind at a time: create the object for one kind, move that kind's branch
   into it, route that kind through the factory, run the tests, and repeat (Ch.6).
5. Then add the new kind test-first, as a new object and one entry in the factory.
6. A missing or default case is a kind too. Give it an object that answers the same messages and
   does the harmless thing, instead of checking for it at every call site (Nothing is Something,
   2015; the article The Shape at the Bottom of All Things, 2014).

## Factory forms

Pick by what changes and who has to read it (Ch.7; If You Build It, They Will Come, 2022).

| Form | Open to a new kind without editing it | Cost |
| --- | --- | --- |
| A `switch` over the kind | No | None to read |
| A map from key to constructor | No, but the edit is one data entry | The data sits apart from the code that uses it |
| Each candidate says whether it handles the key | No, while the factory holds the list of candidates | Order matters, and two candidates can both claim a key |
| Candidates register themselves | Yes | Each candidate depends on the registry |

Lookups built from naming conventions (a class name assembled from a string) are open but cannot be
searched for and fail quietly on a typo (Ch.7). This skill starts from the `switch` and prefers an
explicit map over a name-built lookup in JavaScript and TypeScript.
TypeScript (this skill's inference): type the map as `Record<Kind, ...>` over a union of kind
literals, so the compiler reports a kind with no entry.

## Flag arguments

A boolean or a mode string passed into shared code makes the caller choose a branch inside the
callee, and each conditional it adds doubles the paths through the code (Polly Want a Message,
2018). Do not add another.

1. Name the flag list as the problem, not its length: the shared code is doing several jobs and the
   callers pick between them.
2. Pass in something that already knows how to do the caller's part (an object or a function for
   that purpose) instead of a flag the callee has to translate. Translate a token into an object as
   early, and as far up the call chain, as possible (the article The Shape at the Bottom of All
   Things, 2014).
3. Where an option has a usual value, inject the collaborator with that value as the default rather
   than adding a flag and an `if` (the article Getting It Right By Betting On Wrong, 2014).
4. Bundling the flags into an options object hides the count but keeps the branching; it is not the
   cure. When the shared code has been bent this way by several callers, it may be the wrong
   abstraction: see [duplication-and-abstraction.md](duplication-and-abstraction.md).
