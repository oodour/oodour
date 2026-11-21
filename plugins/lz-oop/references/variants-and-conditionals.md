# Variants and conditionals

Use when a conditional switches on a kind, type or status, when a new kind has to be added, or when a boolean or string
argument steers what shared code does.

Contents: Choosing versus doing; What a conditional's form tells the reader; Signs of a role nobody named; Adding a kind
when the code switches on kinds; When two unrelated rules apply: make every case the same; Factory forms; Flag
arguments.

## Choosing versus doing

Sort each conditional into one of two groups. A conditional that both recognises each case and holds that case's
behaviour is procedural, while one that only records which object gets the job, kept in one place apart from the
behaviour, is the object-oriented form.

- **It chooses which object to use.** One conditional that maps a kind to an object is fine, and some such choice is
  unavoidable. Keep it.
- **It does the work for each kind.** Branches that compute, format or decide something per kind mean an object per kind
  is missing. Every new kind adds a branch here and in each place that switches on the same value.

**Discriminated unions in TypeScript.** A union of object types told apart by a literal field such as `kind` is a fine
shape for data that crosses a boundary: API messages, parsed JSON, store actions.

- **Turn the tag into an object where the data arrives.** A factory reads the `kind` field there, once, and its `switch`
  only chooses an object: the choosing conditional above, in its one place. A tag is a weak stand-in to replace with an
  object as early as possible; see Factory forms for the `switch` the compiler checks.
- **A `switch` over the union that does each kind's work is the doing kind,** a smell even when it is the only one.
  Leave it while nothing changes, as Shameless Green would; when a change touches it (a new kind, a new rule, a second
  `switch` over the same union), give each kind its own object.
- **Exhaustiveness does not change that.** A `satisfies never` check, or the
  `@typescript-eslint/switch-exhaustiveness-check` rule, lists every `switch` a new kind must edit. It removes none of
  the edits.
- **Nicer syntax is still the doing kind.** Easier conditionals tempt people away from new objects. A `ts-pattern` match
  or a `switch (true)` that does each kind's work is the same smell.
- **A `switch` a framework or boundary requires is a factory at the edge**: a reducer, a message or event dispatcher, a
  command-line or HTTP router. Each branch only picks the handler object, and every handler answers one shared message
  and reads the raw input itself; the branch translates nothing. A typed table (`satisfies Record<Kind, Handler>`) or
  handlers that each say whether they take an input are the same choice in another form. A reducer branch that computes
  the next state does the work: the smell above. The reasons: objects are built near the edge from raw input and used
  further in; outside input becomes an object as early as possible; and a switch, a lookup table and a naming-convention
  lookup are one conditional written three ways, with a name-to-class table counted as configuration rather than logic.

Avoid: the conditional does each kind's work, so a new room kind edits this function and every other `switch` on `kind`.

```ts
type Room = { kind: 'standard' | 'suite'; nights: number };

function nightlyCharge(room: Room): number {
  switch (room.kind) {
    case 'standard':
      return 90 * room.nights;
    case 'suite':
      return 210 * room.nights + 40;
  }
}
```

Prefer: one conditional only chooses the object, and each object does its own work.

```ts
interface Stay {
  charge(): number;
}

class StandardStay implements Stay {
  readonly #nights: number;

  constructor(nights: number) {
    this.#nights = nights;
  }

  charge(): number {
    return 90 * this.#nights;
  }
}

class SuiteStay implements Stay {
  readonly #nights: number;

  constructor(nights: number) {
    this.#nights = nights;
  }

  charge(): number {
    return 210 * this.#nights + 40;
  }
}

function stayFor(room: Room): Stay {
  switch (room.kind) {
    case 'standard':
      return new StandardStay(room.nights);
    case 'suite':
      return new SuiteStay(room.nights);
  }
}
```

A new kind is now one class and one `case` in `stayFor`; senders call `stayFor(room).charge()` and never ask the kind.

## What a conditional's form tells the reader

Use when writing or reviewing a conditional, and before deciding whether it should become objects. The form of a
conditional is a message to whoever reads it next; choose the one whose message is accurate.

- **Test for one exact value.** Prefer `===` against a named value to `<`, `>` or a range, even when the tests pass
  either way. Only that value reaches the special branch, anything unexpected falls to the default, and the precision
  helps later refactorings. Lined up, equality tests also show which values are special, and those values are the cue
  for giving each its own object.
- **`switch` for cases that are alike, `if`/`else if` for conditions that differ.** A `switch` says each case compares
  one subject with a written value, so the cases are alike. An `else if` chain says each condition may test something
  different, so the reader checks each one. Use the form that matches what the conditions do.
- **No nested ternaries.** The reader has to hold one condition in mind while decoding the next, and the saved lines are
  not worth that effort.
- **Same logic, same shape.** When several conditionals do the same thing, write them all in one form; mixing ternaries,
  guard clauses and full `if`/`else` blocks for the same logic makes alike code look different, and the Squint Test can
  no longer spot the pattern.
- **An early return means stop now.** Keep it for an exit that really is exceptional. Where the branches are a few
  roughly equal alternatives, an early return signals an exit nothing in the code calls for; give such alternatives one
  equal form, a `switch` or a full `if`/`else`.
- **Keep only the smallest difference inside, and name what varies.** When a rule meets one exception partway through a
  refactoring, keep in the conditional only what differs between the two cases, move out what both share, and keep both
  branches even when one is almost empty. Seeing both sides makes the name cover the one idea they express, not the
  exception alone: a symmetrical conditional. Name its parameter for what the value is here, too.

An example of the last point: name the concept the branches vary, not the exception.

```ts
function leadTimeDays(region: string): number {
  if (region === 'domestic') {
    return 2;
  } else {
    return 7;
  }
}
```

A name such as `isOverseasDelay` would describe only one branch.

**Gather one decision into one conditional before judging it.** The parts of a single decision often lie apart: a flag
set in one method, a check of it in another, and a value filled in lazily somewhere else that is in fact the decision's
other branch. Bring the parts into one explicit conditional first; only then can you see the decision whole and judge
whether it should become objects. Creating a collaborator on first use with `??=` (Injecting collaborators in
[javascript-and-typescript.md](javascript-and-typescript.md)) is not such a branch: it builds the same object either
way.

## Signs of a role nobody named

A role (a duck type) is an agreement on a set of messages that says nothing about which class answers; once the sender
trusts every player to answer, it stops caring which class it holds. These signs say a role exists in the code but was
never named or given its own objects:

- A check on what kind of object an argument is, a Liskov smell and procedural code: `instanceof`, an `in` check (the
  `#field in obj` brand check of ES2022 included, outside a class comparing itself with another of its kind), a switch
  on a `kind` field, and `typeof` or `Array.isArray` used to pick behaviour per kind of value inside domain code.
  Checking outside input at a boundary is a different job. A factory's one `switch` on a `kind` field that only chooses
  an object is not this sign (see Choosing versus doing). In TypeScript, a type predicate (`isInvoice(x): x is Invoice`)
  or a `this is` method is the same check in typed form, not a cure for it. A method that answers a domain question
  about its own object and returns a `boolean` (`invoice.isPaid()`) is not this sign, but a sender that branches on that
  boolean to supply the object's behaviour itself is the same sign in another form.
- A function or class that answers a question about another object (`shippingRules.isFragile(item)`) rather than sending
  the question to it. Objects should describe themselves: give each kind the method and send it the message
  (`item.isFragile()`), a role every such kind plays. A policy object chosen per case (a Strategy) escapes the sign only
  when the decision is a varying rule of its own, decided from what it is given; when it answers a question about the
  nature of the object it is handed, move that answer onto the object, whether or not the policy checks kinds. Move such
  a question one kind at a time: add the method to one kind, make the old function call it for that kind, and check the
  step by running the old function's tests unchanged, plus a new test of the method on that kind; repeat for each kind,
  then delete the old function once no branch is left.
- A type symbol or status string that picks the branches.
- A check for null or `undefined` before each use.
- Several names that share a prefix or suffix; the repeated part is a missing object.
- A flag passed in where a smarter object should be.

A switch on the language's own built-in, stable types is tolerable, as when a utility formats a number one way and a
string another; the sign above is such a switch in domain code, deciding behaviour that a domain object could own.
Elsewhere, one class check undoes the trust the role gives: send the message, and let a factory pick the player so the
sender stays unaware of the choice. Each new player of a role gets the role's shared test; see Role tests in
[javascript-and-typescript.md](javascript-and-typescript.md).

## Adding a kind when the code switches on kinds

1. Restructure first, with the tests green and unchanged, until adding the kind is easy; the new kind comes after.
2. Give each kind its own object (a class, or a module or object literal where that is the house style). Every one of
   them answers the same messages, so a caller sends the message and never asks which kind it holds.
3. Put the choice in one place, a factory: the only code that knows the concrete kinds and how to pick one. Move object
   creation into a single method first; that method becomes the factory. No other code repeats the choice.
4. Move the branches one kind at a time: create the object for one kind, move that kind's branch into it, route that
   kind through the factory, run the tests, and repeat.
5. Then add the new kind test-first, as a new object and one entry in the factory. The new object runs the role's shared
   test (Role tests in [javascript-and-typescript.md](javascript-and-typescript.md)), and the factory's test gains one
   case that checks which object it returns for the new key (Unit tests per class in [test-first.md](test-first.md)).
6. A missing or default case is a kind too. Give it an object that answers the same messages and does the harmless
   thing, instead of checking for it at every call site.

Done, which is what code open to a new kind looks like: each kind is its own object; one factory, which may be a single
conditional, chooses among them; senders and receivers know little about each other, usually because the receiver is
injected; and the sender treats every kind alike, as a player of one role. This indirection makes the code harder to
follow at first, in return for cheaper changes later.

## When two unrelated rules apply: make every case the same

Use when a conditional picks between two rules, and an object per rule would still leave something that has to choose
between them. Run the tests after every step, and undo a step that turns them red (the working rule for every
restructuring recipe here; the test-first step of Adding a kind starts from a red test).

1. Ask whether the rules are variants of one idea. If they are, give each its own object that plays one role and inject
   the one to use (see Adding a kind above). If they are two separate jobs that act on the same input, they are not
   alternatives, and choosing between them is the mistake.
2. Split the jobs into steps and pass every input through all of them, in order.
3. Let a step leave an input it does not concern unchanged. Do not first check whether the step applies: that check is
   the conditional being removed.
4. Accept the extra work on inputs that pass through unchanged; treating every case alike is worth it, for simpler code
   and easier tests.

Done when no conditional chooses between the rules, each rule is one small step, and every input takes the same path.

## Factory forms

Pick by what changes and who has to read it.

| Form                                           | Open to a new kind without editing it              | Cost                                                   |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| A `switch` over the kind                       | No                                                 | None to read                                           |
| A map from key to constructor                  | No, but the edit is one data entry                 | The data sits apart from the code that uses it         |
| Each candidate says whether it handles the key | No, while the factory holds the list of candidates | Order matters, and two candidates can both claim a key |
| Candidates register themselves                 | Yes                                                | Each candidate depends on the registry                 |

Lookups built from naming conventions (a class name assembled from a string) are open but cannot be searched for and
fail quietly on a typo.

- **Where the choosing logic lives.** By default it lives in the factory, which suits a choice that is simple and
  stable. When the test for a kind grows complex and changes whenever that kind changes, move it into the kind itself,
  and have each candidate report whether it handles the input (the third row).
- **Which form to start from.** Weigh these forms by cost and leave the choice to the situation; the `switch` is easiest
  to read and may stay in finished code. Start from a `switch` in the one factory. Move to a map when the mapping is
  better kept as data: other code has to stay in step with the list, or it comes from configuration (see Choosing a
  variant: the factory map in [javascript-and-typescript.md](javascript-and-typescript.md)). When kinds arrive so often
  that editing the factory is itself the cost, weigh an open form from the table. Prefer an explicit list over a
  name-built lookup, which is a last resort.
- **A `switch` the compiler checks.** When the kinds are a closed set with no ordinary case, a TypeScript `default` with
  `kind satisfies never` (and a throw) fails the build when a kind has no `case`: the same check the map gets from
  `satisfies Record<Kind, ...>`. When the domain has an ordinary case, the `default`, or the map's fallback, returns
  that player instead, and this check does not apply. For a discriminated union, the map can be keyed on its tag,
  `Record<Message['kind'], ...>`. The example is in Choosing a variant: the factory map, in
  [javascript-and-typescript.md](javascript-and-typescript.md).
- **Let the branches only pick a class.** Have each branch of a conditional factory choose a class and nothing more,
  with one construction call after the conditional. The choosing part can then become a `switch`, a map or a candidate
  list without touching how the object is built.
- **Keep a role's players and their factory together.** Put the small classes that play one role, and the factory that
  chooses among them, in one module named for the concept, so a reader sees the whole set and where the next one goes; a
  one-class-per-file habit should not stop you making small objects. In TypeScript the module exports the role type and
  the factory, and a player only where a test or another module needs it.
- **A catch-all candidate goes last.** In a candidate list, a default that claims every key stays at the end, so it
  answers only when no other candidate did; registration puts new kinds at the front, ahead of it.
- **Name the message, not the receiver.** Keep the receiver's type out of a message's name: the sender should not need
  to know which kind it holds, and a name that repeats the type breaks when the type is renamed. A generic factory name
  (`for`, `create`) lets one factory stand in for another.

## Flag arguments

A boolean or a mode string passed into shared code makes the caller choose a branch inside the callee, and each
conditional it adds doubles the paths through the code. Do not add another. This is control coupling: the receiver ends
up making a choice that belongs with the caller, which already knows enough to hand over the collaborator that does the
work. Sometimes only the receiver holds what the choice needs.

When a finding uses the name Flag Argument, keep to its narrower test: a caller passes a literal to pick which branch
runs. A value computed at run time and passed along is not one, and an option stored on an object and tested in many of
its methods is Repeated Switches.

1. Name the flag list as the problem, not its length: the shared code is doing several jobs and the callers pick between
   them.
2. Before proposing a new shape, ask whether several callers have bent this shared code, each with its own combination
   of flags. If so, say that it may be the wrong abstraction, and weigh undoing it: the code goes back into each caller
   first, and only what is truly shared is extracted again (see Shared code that callers keep bending in
   [duplication-and-abstraction.md](duplication-and-abstraction.md)).
3. Pass in something that already knows how to do the caller's part (an object or a function for that purpose) instead
   of a flag the callee has to translate. Translate a token into an object as early, and as far up the call chain, as
   possible.
4. Where an option has a usual value, inject the collaborator rather than adding a flag and an `if`. Give it that value
   as a default only when the class can justify that player on its own (Injecting collaborators in
   [dependencies-and-messages.md](dependencies-and-messages.md)).
5. Bundling the flags into an options object hides the count but keeps the branching; it is not the cure.

Make each of these changes in green steps: run the tests after every edit, and undo an edit that turns them red. Done
when the shared code takes no flag for the choice; each caller hands over the collaborator that does its part, relies on
the default collaborator (step 4), or, where the abstraction was wrong, holds its own copy of what it needed (step 2);
and adding a caller's variant adds no `if` to the shared code. Also check three marks: the do-nothing case is an object
of its own, the collaborator is chosen in a factory as far up as the facts allow, and a new variant adds one object and
one factory entry. Name each mark that fails as the next step; it does not hold back the Done line.
