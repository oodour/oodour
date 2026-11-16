# Testing an object's messages

Use when someone asks what to assert in a unit test, whether to mock a collaborator, or how to test a
private method.

Contents: The message grid; Doubles (How far to mock); Testing a hierarchy; When a test resists being written; Unit
tests and integration tests; Other guidance.

*Practical Object-Oriented Design* judges a test by what it costs against what it saves: writing it, running it,
and keeping it up to date as the code changes. When tests cost too much, *Practical Object-Oriented Design*'s
answer is to get better at testing, not to give it up; that includes removing duplicate tests and checking each
behaviour in one place. The grid below is how to aim them.

## The message grid

Sort every message the object under test takes part in by where it goes and what it does (the talk
The Magic Tricks of Testing, 2013). A **query** returns something and changes nothing; a **command**
changes something.

| Message | Query | Command |
| --- | --- | --- |
| Received from outside | Assert what it returns | Assert its effect, as seen through the object's public interface |
| Sent to itself (private) | Do not test | Do not test |
| Sent to a collaborator | Do not assert it was sent | Expect it to be sent, with its arguments |

- **Received from outside**: test the object through the messages others send it. Assert on the
  returned value, or on the change a command makes that a caller could observe. A public method that nothing
  sends any more is not tested: delete it, and its tests with it (*Practical Object-Oriented Design*).
- **Sent to itself**: private methods are covered by the tests of the public messages that use them.
  Do not reach them through casts, bracket access, or by making them public for the test.
- **An outgoing query**: the collaborator's own tests cover it. Stub it to return a value the test
  needs, and leave it unverified: asserting that a query was called, or how often, ties the test to
  how the object works, not what it does.
- **An outgoing command**: its effect belongs to another object, so the test checks only that the
  message went out with the right arguments, using a mock or a spy.

## Doubles

- A plain object that answers the role's messages is usually enough to stand in for a collaborator, and a mock is
  for proving that an outgoing command was sent (*Practical Object-Oriented Design*, which keeps the word mock for
  that use alone). This plugin uses Meszaros's wider words: a double is any stand-in, and stubs, fakes and mocks
  are kinds of double. In answers, call a stand-in a double; name it a stub when it only returns canned answers, a
  mock or spy when the test checks a command it received, and a fake when it is a lighter working version of the
  collaborator.
- A double has to match the real collaborator's interface, or the test stays green while the code
  breaks (The Magic Tricks of Testing, 2013). *Practical Object-Oriented Design* shows the trap: after a role
  message is renamed, a hand-written double that still answers the old name keeps the sender's test green while the
  program is broken, until the shared role test (below) runs against the double as well.
- A fake is a small real object that plays the collaborator's role, so a test can show what the class does
  without depending on the real collaborator's output (*99 Bottles of OOP*, which files its fake under Meszaros's
  definition). This plugin reads that use as wider than Meszaros's: his fake is a lighter working stand-in for a
  slow or missing collaborator, and a stand-in that feeds the class under test canned answers is his stub.
- A double can echo its input in its output, so the tests of the class that uses it show which inputs it asked for
  and in what order (*99 Bottles of OOP* and its companion code, which call it a fake). In answers, name it a stub:
  it only answers, with values made from what it was asked (this plugin's naming). Bounds such as the start and end
  of a range can come in as constructor arguments, so a test of the whole run can use a tiny range instead of the
  real one (the same book).
- Where several objects play one role, fakes included, a shared role test checks that each one
  answers the role's messages (the book). TypeScript (this plugin's inference): an interface for the role,
  with each player typed against it, does part of that check at compile time; a role test still
  checks behaviour the types cannot express. How to write that shared test in Vitest, Jest and
  `node:test`: [javascript-and-typescript.md](javascript-and-typescript.md), Role tests.
- The sending side of a role has its own test: that a sender sends the role's message. Keep it in that sender's
  test while it is the only sender of its kind, and move it into a shared test only once a second such sender
  appears (*Practical Object-Oriented Design*).

### How far to mock

Use when deciding whether a collaborator gets a double or the real object.

- **Double only what you own.** Sandi Metz holds herself to mocking only classes she owns (the talk SOLID
  Object-Oriented Design, 2009). In that talk, a job that called a remote-transfer library directly could not be
  mocked; she moved the transfer into a class of her own, injected it, and mocked that class in the job's test.
  The real class could then be checked against the real server in a separate slow suite. Moving foreign calls
  behind your own object is in [dependencies-and-messages.md](dependencies-and-messages.md), Interfaces you do not
  own.
- **Use the real object when it is cheap.** A collaborator with nothing external behind it, that runs fast and only
  holds data, such as a value object passed in as an argument, goes into the test as itself; trying to mock
  everything makes the code fragile (SOLID Object-Oriented Design, 2009). For an outgoing command whose effect is
  cheap and close by, plugging in the real object is fine too; the further and costlier the effect, the more a mock
  at the nearest boundary pays (The Magic Tricks of Testing, 2013). In this plugin that covers a command receiver the
  class creates itself and keeps hidden; one injected or passed to a method follows the next bullet.
- **Double an injected collaborator.** A cheap collaborator that plays a role and is injected through the
  constructor or passed to a method, such as a clock, gets a double: a stub when the class only asks it questions, a
  mock or spy when the test checks a command it receives; the bullet
  above covers data passed in and hidden command receivers, not role players handed in (this plugin's
  reconciliation; the sources follow). *99 Bottles of OOP* replaces a collaborator the class receives from outside
  with a fake, so the test tells the class's own story, and keeps the fake honest with the role test from Doubles.
  A small collaborator the class creates itself and keeps hidden may stay real until it grows. *Practical
  Object-Oriented Design* draws the line by the role instead: fake it when the role has many players, when its
  players are costly to run, or when none has been written yet; use the real object when it is the role's only,
  cheap player, so that renaming it or its messages breaks the test as it should, at the price of a test that hides
  the role. Where the two differ, this plugin follows *99 Bottles of OOP*.
- **Do not assert on what a double supplied.** A value a stub was told to return only feeds the result the test
  checks; asserting on that value checks the stub (this plugin's reading of the message grid above, which keeps
  assertions on values for messages received from outside).

Done: every double stands for an object your code owns, and every assertion checks a value the object under test
computed or an outgoing command it sent.

## Testing a hierarchy

Use when someone asks how to test a parent class and its subclasses. The layers below follow *Practical
Object-Oriented Design*, which presents each one as a test, and her public example-code repositories for it, poodr
and poodr2;
the reasons are *Practical Object-Oriented Design*'s unless marked as this plugin's. In a Defining
Object-Oriented Design Q&A she says only that her tests check that the parent throws for a step it
cannot supply and that each subclass supplies it.

1. **One shared test for the parent's interface.** Every subclass runs it, and so does the parent,
   built with whatever it needs so its throwing default never runs. It is the role test from
   Doubles, applied to a hierarchy.
2. **A shared test for the hooks.** Every subclass runs a second shared test that checks it answers
   each hook the parent calls. Then each subclass gets its own test of the value its hooks supply.
3. **The parent throws for a required hook.** One test, on the parent.
4. **The template method, through a subclass made for the test.** A small subclass in the test file
   supplies fixed hook values, so the parent's template method is tested without any real subclass.
   That test subclass also runs the hook test from step 2, so it cannot drift from the real ones.

With an `abstract` parent in TypeScript, two steps change (this plugin's adjustment, not part of
the example code). Step 1 runs on every subclass and on the test subclass from step 4, since
the parent cannot be built. Step 3 has no test: the compiler refuses a subclass that leaves out a
required hook. Steps 2 and 4 stay as they are. The TypeScript form: Hooks and required steps in
TypeScript in [javascript-and-typescript.md](javascript-and-typescript.md).

For each subclass, the shared tests prove it can stand in for the parent, as Liskov Substitution asks; its own test
checks only what it adds, and nothing tests the parent's code again through every subclass (*Practical
Object-Oriented Design*'s reasoning). The shared tests in Vitest, Jest and `node:test`:
[javascript-and-typescript.md](javascript-and-typescript.md), Role tests.

## When a test resists being written

Heavy setup, many doubles, or a long chain to build are design feedback: the object knows too many
others or reaches through them. Fix the code rather than the test (*99 Bottles of OOP*; the talk Get a Whiff of
This, 2016). See [dependencies-and-messages.md](dependencies-and-messages.md).

## Unit tests and integration tests

- They have different jobs (*99 Bottles of OOP*). A unit test sends messages to one class's public interface and
  leaves its collaborators out of the question: it is the programmer's tool, fast, and fails close to the fault. An
  integration test shows that a group of objects works together from end to end; it is slower and points less
  precisely. Do not ask one kind to do the other's job.
- A test that only restates what the code returns verbatim, such as a method that returns a fixed string, checks
  nothing that could break on its own: it must be edited whenever the code is. Let that method run inside another
  class's tests instead (the book).
- *99 Bottles of OOP*'s default is a test for every public method of every class. It offers, tentatively, a looser
  reading of full coverage: every line runs under the unit tests, not one test per public method. Leaving a class
  without its own tests is the exception and needs a reason: the class is small, simple and hidden from outside callers
  (the book).

## Other guidance

- Assert hard-coded expected values. A test that computes its expectation with the code under test,
  or rebuilds its logic, passes when both are wrong (*99 Bottles of OOP*).
- Test what the code does, not how: a pure restructuring that turns a test red shows the test checks
  how (the book).
- Complex private logic may get a temporary test while you work on it, kept apart from the rest and
  deleted the first time it fails (The Magic Tricks of Testing, 2013).
