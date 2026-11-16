# Testing an object's messages

Use when someone asks what to assert in a unit test, whether to mock a collaborator, or how to test a
private method.

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
  returned value, or on the change a command makes that a caller could observe.
- **Sent to itself**: private methods are covered by the tests of the public messages that use them.
  Do not reach them through casts, bracket access, or by making them public for the test.
- **An outgoing query**: the collaborator's own tests cover it. Stub it to return a value the test
  needs, and leave it unverified: asserting that a query was called, or how often, ties the test to
  how the object works, not what it does.
- **An outgoing command**: its effect belongs to another object, so the test checks only that the
  message went out with the right arguments, using a mock or a spy.

## Doubles

- A double has to match the real collaborator's interface, or the test stays green while the code
  breaks (The Magic Tricks of Testing, 2013).
- A fake (Meszaros's term) is a small real object that plays the collaborator's role, so a test can
  show what the class does without depending on the real collaborator's output (*99 Bottles of OOP*).
- Where several objects play one role, fakes included, a shared role test checks that each one
  answers the role's messages (the book). TypeScript (this plugin's inference): an interface for the role,
  with each player typed against it, does part of that check at compile time; a role test still
  checks behaviour the types cannot express. How to write that shared test in Vitest, Jest and
  `node:test`: [javascript-and-typescript.md](javascript-and-typescript.md), Role tests.

### How far to mock

Use when deciding whether a collaborator gets a double or the real object.

- **Double only what you own.** Sandi Metz holds herself to mocking only classes she owns (the talk SOLID
  Object-Oriented Design, 2009). In that talk, a job that called a remote-transfer library directly could not be
  mocked; she moved the transfer into a class of her own, injected it, and mocked that class in the job's test.
  The real class could then be checked against the real server in a separate slow suite. Moving foreign calls
  behind your own object is in [dependencies-and-messages.md](dependencies-and-messages.md), Interfaces you do not
  own.
- **Use the real object when it is cheap.** A collaborator with nothing external behind it, that runs fast and only
  holds data, such as a value object, goes into the test as itself; trying to mock everything makes the code fragile
  (SOLID Object-Oriented Design, 2009). For an outgoing command whose effect is cheap and close by, plugging in the
  real object is fine too; the further and costlier the effect, the more a mock at the nearest boundary pays (The
  Magic Tricks of Testing, 2013).
- **Do not assert on what a double supplied.** A value a stub was told to return only feeds the result the test
  checks; asserting on that value checks the stub (this plugin's reading of the message grid above, which keeps
  assertions on values for messages received from outside).

Done: every double stands for an object your code owns, and every assertion checks a value the object under test
computed or an outgoing command it sent.

## Testing a hierarchy

Use when someone asks how to test a parent class and its subclasses. The layers below follow Sandi
Metz's public example code for *Practical Object-Oriented Design*, which shows them as tests with
little explanation; the reasons given are this plugin's unless credited. In a Defining
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

For each subclass, this plugin's reasoning: the shared tests prove it can stand in for the parent,
its own test proves what it adds, and nothing tests the parent's code twice through every
subclass. The shared tests in Vitest, Jest and `node:test`:
[javascript-and-typescript.md](javascript-and-typescript.md), Role tests.

## When the test is hard to write

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
- Full coverage means every line runs under the unit tests, not one test per public method. Leaving a class without
  its own tests is the exception and needs a reason: the class is small, simple and hidden from outside callers
  (the book).

## Other guidance

- Assert hard-coded expected values. A test that computes its expectation with the code under test,
  or rebuilds its logic, passes when both are wrong (*99 Bottles of OOP*).
- Test what the code does, not how: a pure restructuring that turns a test red shows the test checks
  how (the book).
- Complex private logic may get a temporary test while you work on it, kept apart from the rest and
  deleted the first time it fails (The Magic Tricks of Testing, 2013).
