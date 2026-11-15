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
  show what the class does without depending on the real collaborator's output (Ch.9).
- Where several objects play one role, fakes included, a shared role test checks that each one
  answers the role's messages (Ch.9). TypeScript (this skill's inference): an interface for the role,
  with each player typed against it, does part of that check at compile time; a role test still
  checks behaviour the types cannot express.

## When the test is hard to write

Heavy setup, many doubles, or a long chain to build are design feedback: the object knows too many
others or reaches through them. Fix the code rather than the test (Ch.9; the talk Get a Whiff of
This, 2016). See [dependencies-and-messages.md](dependencies-and-messages.md).

## Other guidance

- Assert hard-coded expected values. A test that computes its expectation with the code under test,
  or rebuilds its logic, passes when both are wrong (Ch.2).
- Test what the code does, not how: a pure restructuring that turns a test red shows the test checks
  how (Ch.3).
- Complex private logic may get a temporary test while you work on it, kept apart from the rest and
  deleted the first time it fails (The Magic Tricks of Testing, 2013).
