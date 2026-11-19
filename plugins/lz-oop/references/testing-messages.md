# Testing an object's messages

Use when someone asks what to assert in a unit test, whether to mock a collaborator, or how to test a private method.

Contents: The message grid; Doubles (How far to mock); Testing a hierarchy; When a test resists being written; Unit
tests and integration tests; Other guidance.

Judge a test by what it costs against what it saves: writing it, running it, and keeping it up to date as the code
changes. When tests cost too much, get better at testing rather than give it up; that includes removing duplicate tests
and checking each behaviour in one place. The grid below is how to aim them.

## The message grid

Sort every message the object under test takes part in by where it goes and what it does. A **query** returns something
and changes nothing; a **command** changes something.

| Message                  | Query                     | Command                                                          |
| ------------------------ | ------------------------- | ---------------------------------------------------------------- |
| Received from outside    | Assert what it returns    | Assert its effect, as seen through the object's public interface |
| Sent to itself (private) | Do not test               | Do not test                                                      |
| Sent to a collaborator   | Do not assert it was sent | Expect it to be sent, with its arguments                         |

- **Received from outside**: test the object through the messages others send it. Assert on the returned value, or on
  the change a command makes that a caller could observe. A public method that nothing sends any more is not tested:
  delete it, and its tests with it.
- **Sent to itself**: private methods are covered by the tests of the public messages that use them. Do not reach them
  through casts, bracket access, or by making them public for the test.
- **An outgoing query**: the collaborator's own tests cover it. Stub it to return a value the test needs, and leave it
  unverified: asserting that a query was called, or how often, ties the test to how the object works, not what it does.
- **An outgoing command**: its effect belongs to another object, so the test checks only that the message went out with
  the right arguments, using a mock or a spy.

## Doubles

- A plain object that answers the role's messages is usually enough to stand in for a collaborator, and a mock is for
  proving that an outgoing command was sent. In answers, use the wider vocabulary: a double is any stand-in, and stubs,
  fakes and mocks are kinds of double. Call a stand-in a double; name it a stub when it only returns canned answers, a
  mock or spy when the test checks a command it received, and a fake when it is a lighter working version of the
  collaborator.
- A double has to match the real collaborator's interface, or the test stays green while the code breaks. The trap:
  after a role message is renamed, a hand-written double that still answers the old name keeps the sender's test green
  while the program is broken, until the shared role test (below) runs against the double as well.
- A fake is a small real object that plays the collaborator's role, so a test can show what the class does without
  depending on the real collaborator's output. A stand-in that only feeds the class under test canned answers is a stub.
- A double can echo its input in its output, so the tests of the class that uses it show which inputs it asked for and
  in what order. In answers, name it a stub: it only answers, with values made from what it was asked. Bounds such as
  the start and end of a range can come in as constructor arguments, so a test of the whole run can use a tiny range
  instead of the real one.
- Where several objects play one role, fakes included, a shared role test checks that each one answers the role's
  messages. TypeScript: an interface for the role, with each player typed against it, does part of that check at compile
  time; a role test still checks behaviour the types cannot express. How to write that shared test in Vitest, Jest and
  `node:test`: [javascript-and-typescript.md](javascript-and-typescript.md), Role tests.
- The sending side of a role has its own test: that a sender sends the role's message. Keep it in that sender's test
  while it is the only sender of its kind, and move it into a shared test only once a second such sender appears.

### How far to mock

Use when deciding whether a collaborator gets a double or the real object.

- **Double only what you own**. When code calls a foreign library directly, move the call into a class of your own,
  inject it, and mock that class in the caller's test. Check the real class against the real service in a separate slow
  suite. Moving foreign calls behind your own object is in [dependencies-and-messages.md](dependencies-and-messages.md),
  Interfaces you do not own.
- **Use the real object when it is cheap.** A collaborator with nothing external behind it, that runs fast and only
  holds data, such as a value object passed in as an argument, goes into the test as itself; trying to mock everything
  makes the code fragile. For an outgoing command whose effect is cheap and close by, plugging in the real object is
  fine too; the further and costlier the effect, the more a mock at the nearest boundary pays. That covers a command
  receiver the class creates itself and keeps hidden; one injected or passed to a method follows the next bullet.
- **Double an injected collaborator.** A cheap collaborator that plays a role and is injected through the constructor or
  passed to a method, such as a clock, gets a double: a stub when the class only asks it questions, a mock or spy when
  the test checks a command it receives; the bullet above covers data passed in and hidden command receivers, not role
  players handed in. The double lets the test tell the class's own story; keep it honest with the role test from
  Doubles. A small collaborator the class creates itself and keeps hidden may stay real until it grows.
- **Do not assert on what a double supplied.** A value a stub was told to return only feeds the result the test checks;
  asserting on that value checks the stub (the message grid above keeps assertions on values for messages received from
  outside).
- **Prefer a hand-written role player in new code.** One plain object that plays the role, written once and reused
  across tests, beats repeating mock-library stubs and expectations, and needing many of them reads as a sign about the
  design, not about the test. For an outgoing command, let that object record the command it received, so the grid above
  still holds.

Done: every double stands for an object your code owns, and every assertion checks a value the object under test
computed or an outgoing command it sent.

## Testing a hierarchy

Use when someone asks how to test a parent class and its subclasses. Each layer below is a test.

1. **One shared test for the parent's interface.** Every subclass runs it, and so does the parent, built with whatever
   it needs so its throwing default never runs. It is the role test from Doubles, applied to a hierarchy.
2. **A shared test for the hooks.** Every subclass runs a second shared test that checks it answers each hook the parent
   calls. Then each subclass gets its own test of the value its hooks supply.
3. **The parent throws for a required hook.** One test, on the parent.
4. **The template method, through a subclass made for the test.** A small subclass in the test file supplies fixed hook
   values, so the parent's template method is tested without any real subclass. That test subclass also runs the hook
   test from step 2, so it cannot drift from the real ones.

With an `abstract` parent in TypeScript, two steps change. Step 1 runs on every subclass and on the test subclass from
step 4, since the parent cannot be built. Step 3 has no test: the compiler refuses a subclass that leaves out a required
hook. Steps 2 and 4 stay as they are. The TypeScript form: Hooks and required steps in TypeScript in
[javascript-and-typescript.md](javascript-and-typescript.md).

For each subclass, the shared tests prove it can stand in for the parent, as Liskov Substitution asks; its own test
checks only what it adds, and nothing tests the parent's code again through every subclass. The shared tests in Vitest,
Jest and `node:test`: [javascript-and-typescript.md](javascript-and-typescript.md), Role tests.

## When a test resists being written

Heavy setup, many doubles, or a long chain to build are design feedback: the object knows too many others or reaches
through them. Fix the code rather than the test. See [dependencies-and-messages.md](dependencies-and-messages.md).

## Unit tests and integration tests

- They have different jobs. A unit test sends messages to one class's public interface and leaves its collaborators out
  of the question: it is the programmer's tool, fast, and fails close to the fault. An integration test shows that a
  group of objects works together from end to end; it is slower and points less precisely. Do not ask one kind to do the
  other's job.
- A test that only restates what the code returns verbatim, such as a method that returns a fixed string, checks nothing
  that could break on its own: it must be edited whenever the code is. Let that method run inside another class's tests
  instead.
- The default is a test for every public method of every class. A looser reading of full coverage, offered tentatively:
  every line runs under the unit tests, not one test per public method. Leaving a class without its own tests is the
  exception and needs a reason: the class is small, simple and hidden from outside callers.
- One workable habit: unit tests plus tests that drive the whole application from its edge, with nothing in between:
  framework handlers stay thin enough to need no unit test of their own, and declining to unit-test them pushes the
  logic into plain objects that the unit tests reach. A handler that holds logic of its own still gets tests.

## Other guidance

- Assert hard-coded expected values. A test that computes its expectation with the code under test, or rebuilds its
  logic, passes when both are wrong.
- Test what the code does, not how: a pure restructuring that turns a test red shows the test checks how.
- Complex private logic may get a temporary test while you work on it, kept apart from the rest and deleted the first
  time it fails.
