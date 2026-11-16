# Variants and conditionals

Use when a conditional switches on a kind, type or status, when a new kind has to be added, or when a
boolean or string argument steers what shared code does.

Contents: Choosing versus doing; What a conditional's form tells the reader; Signs of a role nobody named; Adding a
kind when the code switches on kinds; When two unrelated rules apply: make every case the same; Factory forms; Flag
arguments.

## Choosing versus doing

Sort each conditional into one of two groups (*99 Bottles of OOP*; the talk Polly Want a Message, 2018).
The book draws the contrast directly: a conditional that both recognises each case and holds that case's
behaviour is procedural, while one that only records which object gets the job, kept in one place
apart from the behaviour, is the object-oriented form.

- **It chooses which object to use.** One conditional that maps a kind to an object is fine, and some
  such choice is unavoidable. Keep it.
- **It does the work for each kind.** Branches that compute, format or decide something per kind
  mean an object per kind is missing. Every new kind adds a branch here and in each place that
  switches on the same value.

**Discriminated unions in TypeScript.** A union of object types told apart by a literal field such as
`kind` is a fine shape for data that crosses a boundary: API messages, parsed JSON, store actions. That
reading, and everything here about the compiler, is this plugin's; the sources say nothing on unions or
exhaustiveness checks.

- **Turn the tag into an object where the data arrives.** A factory reads the `kind` field there, once,
  and its `switch` only chooses an object: the choosing conditional above, in its one place. The
  article The Shape at the Bottom of All Things (2014) treats a tag as a weak stand-in to replace with
  an object as early as possible; see Factory forms for the `switch` the compiler checks.
- **A `switch` over the union that does each kind's work is the doing kind,** a smell even when it is
  the only one (the book; the article Ruby Case Statements and kind_of?, 2009). Leave it while nothing
  changes, as the book leaves Shameless Green; when a change touches it (a new kind, a new rule, a
  second `switch` over the same union), give each kind its own object.
- **Exhaustiveness does not change that.** A `satisfies never` check, or the
  `@typescript-eslint/switch-exhaustiveness-check` rule, lists every `switch` a new kind must edit. It
  removes none of the edits.
- **A `switch` a framework or boundary requires is a factory at the edge**: a reducer, a message or event
  dispatcher, a command-line or HTTP router. Each branch only picks the handler object, and every handler
  answers one shared message and reads the raw input itself; the branch translates nothing. A typed table
  (`satisfies Record<Kind, Handler>`) or handlers that each say whether they take an input are the same
  choice in another form. A reducer branch that computes the next state does the work: the smell above.
  This plugin's research found no source on reducers, routers or dispatchers, so this is its own
  application of three things the sources do say: the book builds objects near the edge from raw input
  and uses them further in; outside input becomes an object as early as possible (The Shape at the
  Bottom of All Things, 2014); and a switch, a lookup table and a naming-convention lookup are one
  conditional written three ways (the book), with a name-to-class table counted as configuration rather
  than logic (All the Little Things, 2014).

## What a conditional's form tells the reader

Use when writing or reviewing a conditional, and before deciding whether it should become objects.
The form of a conditional is a message to whoever reads it next; choose the one whose message is
accurate.

- **Test for one exact value.** Prefer `===` against a named value to `<`, `>` or a range, even
  when the tests pass either way. Only that value reaches the special branch, anything unexpected
  falls to the default, and the precision helps later refactorings (*99 Bottles of OOP*). Lined up,
  equality tests also show which values are special, and those values are the cue for giving each
  its own object (the book).
- **`switch` for cases that are alike, `if`/`else if` for conditions that differ.** A `switch`
  says each case compares one subject with a written value, so the cases are alike. An `else if`
  chain says each condition may test something different, so the reader checks each one. Use the
  form that matches what the conditions do (the book).
- **No nested ternaries.** The reader has to hold one condition in mind while decoding the next,
  and the saved lines are not worth that effort (the book).
- **Same logic, same shape.** When several conditionals do the same thing, write them all in one
  form; mixing ternaries, guard clauses and full `if`/`else` blocks for the same logic makes alike
  code look different, and the Squint Test can no longer spot the pattern (the book).
- **An early return means stop now.** Keep it for an exit that really is exceptional. Katrina Owen
  doubts early returns where the branches are a few roughly equal alternatives, since the form
  signals an exit nothing in the code calls for (Overkill, 2014). Giving such alternatives one
  equal form, a `switch` or a full `if`/`else`, is this plugin's reading of her objection.
- **Keep only the smallest difference inside, and name what varies.** When a rule meets one
  exception partway through a refactoring, Owen keeps in the conditional only what differs between
  the two cases, moves out what both share, and keeps both branches even when one is almost empty.
  Seeing both sides makes the name cover the one idea they express, not the exception alone; she
  calls such a conditional symmetrical (Succession, 2016). Name its parameter for what the value is
  here, too (the same talk).

An example of the last point (the plugin's): name the concept the branches vary, not the exception.

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

## Signs of a role nobody named

A role (a duck type) is an agreement on a set of messages and nothing else; once the sender trusts
every player to answer, it stops caring which class it holds (Less, 2011; Polly Want a Message,
2018). These signs say a role exists in the code but was never named or given its own objects:

- A check on what kind of object an argument is. Her talks and articles name a switch on the class and
  Ruby's `kind_of?`, `is_a?` and `respond_to?` (Less, 2011; POODR with the Toronto Ruby Brigade, 2013; the talk
  SOLID Object-Oriented Design, 2009, which treats a kind check as a Liskov smell; the article Ruby Case Statements
  and kind_of?, 2009, which reads a switch on the class as procedural code), and *Practical Object-Oriented Design*
  names the same three checks. The JavaScript and TypeScript equivalents are this plugin's mapping: `instanceof`,
  `typeof` on a domain value, an `in` check, and a switch on a `kind` field.
  A factory's one `switch` on a `kind` field that only chooses an object is not this sign (this
  plugin's reading; see Choosing versus doing).
  In TypeScript, a type predicate (`isInvoice(x): x is Invoice`) or a `this is` method is the same check in typed
  form, not a cure for it. A method that answers a domain question about its own object and returns a `boolean`
  (`invoice.isPaid()`) is not this sign (this plugin's note).
- A function or class that answers a question about another object (`shippingRules.isFragile(item)`) rather than
  sending the question to it. *Practical Object-Oriented Design* wants objects to describe themselves: give each
  kind the method and send it the message (`item.isFragile()`), a role every such kind plays. A policy object chosen
  per case (a Strategy) that decides from what it is given, without checking which kind it holds, is not this sign
  (this plugin's note). Move such a question one kind at a time: add the method to one kind, make the old function
  call it for that kind, and check the step by running the old function's tests unchanged, plus a new test of the
  method on that kind; repeat for each kind, then delete the old function once no branch is left (this plugin's
  note).
- A type symbol or status string that picks the branches (Go Ahead, Make a Mess, 2012).
- A check for null or `undefined` before each use (Nothing is Something, 2015).
- Several names that share a prefix or suffix (All the Little Things, 2014; The Shape at the Bottom
  of All Things, 2014, reads the repeated part as a missing object).
- A flag passed in where a smarter object should be (Polly Want a Message, 2018).

A switch on the language's own built-in, stable types is tolerable (Less, 2011). Elsewhere, one class
check undoes the trust the role gives (Less, 2011): send the message, and let a factory pick the player
so the sender stays unaware of the choice (Devs for Ukraine, 2022). Each new player of a role gets the
role's shared test; see Role tests in [javascript-and-typescript.md](javascript-and-typescript.md).

## Adding a kind when the code switches on kinds

1. Restructure first, with the tests green and unchanged, until adding the kind is easy; the new kind comes after
   (*99 Bottles of OOP*).
2. Give each kind its own object (a class, or a module or object literal where that is the house
   style). Every one of them answers the same messages, so a caller sends the message and never asks
   which kind it holds (the book).
3. Put the choice in one place, a factory: the only code that knows the concrete kinds and how to
   pick one. Move object creation into a single method first; that method becomes the factory. No
   other code repeats the choice (the book; Polly Want a Message, 2018).
4. Move the branches one kind at a time: create the object for one kind, move that kind's branch
   into it, route that kind through the factory, run the tests, and repeat (the book).
5. Then add the new kind test-first, as a new object and one entry in the factory. The new object runs the role's
   shared test (Role tests in [javascript-and-typescript.md](javascript-and-typescript.md)), and the factory's test
   gains one case that checks which object it returns for the new key (Unit tests per class in
   [test-first.md](test-first.md)).
6. A missing or default case is a kind too. Give it an object that answers the same messages and
   does the harmless thing, instead of checking for it at every call site (Nothing is Something,
   2015; the article The Shape at the Bottom of All Things, 2014).

Done, which is what code open to a new kind looks like (the book's summary, in this plugin's words): each kind is its
own object; one factory, which may be a single conditional, chooses among them; senders and receivers know little
about each other, usually because the receiver is injected; and the sender treats every kind alike, as a player of
one role. The book adds that this indirection makes the code harder to follow at first, in return for cheaper
changes later.

## When two unrelated rules apply: make every case the same

Use when a conditional picks between two rules, and an object per rule would still leave something
that has to choose between them. Run the tests after every step, and undo a step that turns them red (this plugin's
working rule, as for every recipe here).

1. Ask whether the rules are variants of one idea. If they are, give each its own object that plays
   one role and inject the one to use (see Adding a kind above). If they are two separate jobs that
   act on the same input, they are not alternatives, and choosing between them is the mistake.
2. Split the jobs into steps and pass every input through all of them, in order.
3. Let a step leave an input it does not concern unchanged. Do not first check whether the step
   applies: that check is the conditional being removed.
4. Accept the extra work on inputs that pass through unchanged; treating every case alike is worth
   it (the article Make Everything The Same, 2016, which chains two conversions this way and
   reports simpler code and easier tests).

Done when no conditional chooses between the rules, each rule is one small step, and every input
takes the same path.

## Factory forms

Pick by what changes and who has to read it (*99 Bottles of OOP*; If You Build It, They Will Come, 2022).

| Form | Open to a new kind without editing it | Cost |
| --- | --- | --- |
| A `switch` over the kind | No | None to read |
| A map from key to constructor | No, but the edit is one data entry | The data sits apart from the code that uses it |
| Each candidate says whether it handles the key | No, while the factory holds the list of candidates | Order matters, and two candidates can both claim a key |
| Candidates register themselves | Yes | Each candidate depends on the registry |

Lookups built from naming conventions (a class name assembled from a string) are open but cannot be
searched for and fail quietly on a typo (the book).

- **Where the choosing logic lives.** By default it lives in the factory, which suits a choice that
  is simple and stable. When the test for a kind grows complex and changes whenever that kind
  changes, the book moves it into the kind itself, and each candidate reports whether it handles the
  input (the third row).
- **Which form to start from.** The book weighs these forms and leaves the choice to the situation.
  This plugin starts from a `switch` in the one factory while the kinds are few. It moves to
  a map, typed so the compiler reports a kind with no entry, once new kinds keep arriving or other
  code has to stay in step with the list (see Choosing a variant: the factory map in
  [javascript-and-typescript.md](javascript-and-typescript.md)). Either way, prefer an explicit list
  over a name-built lookup. These defaults are the plugin's, not the book's.
- **A `switch` the compiler checks.** In TypeScript, a `default` with `kind satisfies never` fails
  the build when a kind has no `case`: the same check the map gets from `satisfies Record<Kind, ...>`.
  For a discriminated union, the map can be keyed on its tag, `Record<Message['kind'], ...>`. The
  example is in Choosing a variant: the factory map, in
  [javascript-and-typescript.md](javascript-and-typescript.md). This form is the plugin's.
- **Name the message, not the receiver.** Keep the receiver's type out of a message's name: the
  sender should not need to know which kind it holds, and a name that repeats the type breaks when
  the type is renamed. A generic factory name (`for`, `create`) lets one factory stand in for another
  (the book).

## Flag arguments

A boolean or a mode string passed into shared code makes the caller choose a branch inside the
callee, and each conditional it adds doubles the paths through the code (Polly Want a Message,
2018). Do not add another. Sandi Metz names this control coupling and calls it an anti-pattern:
the receiver ends up making a choice that belongs with the caller, which already knows enough to
hand over the collaborator that does the work. She allows that sometimes only the receiver holds
what the choice needs (the Q&A after Go Ahead, Make a Mess at Triangle.rb, 2013).

1. Name the flag list as the problem, not its length: the shared code is doing several jobs and the
   callers pick between them.
2. Before proposing a new shape, ask whether several callers have bent this shared code, each with
   its own combination of flags. If so, say that it may be the wrong abstraction, and weigh undoing
   it: the code goes back into each caller first, and only what is truly shared is extracted again
   (see Shared code that callers keep bending in
   [duplication-and-abstraction.md](duplication-and-abstraction.md)).
3. Pass in something that already knows how to do the caller's part (an object or a function for
   that purpose) instead of a flag the callee has to translate. Translate a token into an object as
   early, and as far up the call chain, as possible (the article The Shape at the Bottom of All
   Things, 2014).
4. Where an option has a usual value, inject the collaborator with that value as the default rather
   than adding a flag and an `if` (the article Getting It Right By Betting On Wrong, 2014).
5. Bundling the flags into an options object hides the count but keeps the branching; it is not the
   cure.

Make each of these changes in green steps: run the tests after every edit, and undo an edit that turns them red.
Done when the shared code takes no flag for the choice, each caller hands over the collaborator that does its part,
and adding a caller's variant adds no `if` to the shared code (this plugin's Done line).
