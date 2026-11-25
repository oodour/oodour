# Writing code test-first

Used by the `oodour` skill when a developer writes code test-first, asks which test comes next, or asks how tests behave
while code is restructured. What to assert about an object's messages, and which collaborators to replace, is in
[testing-messages.md](testing-messages.md).

Contents: Before the first test; Choosing the next test; Getting to green; What a test asserts; When to stop; Tests
while restructuring (Tidying the tests after the code has new owners); Unit tests per class; In JavaScript and
TypeScript.

## Before the first test

- Sketch the public API first: which messages will callers send, and with what? Then begin where you understand the
  problem best, usually the simplest single case.
- Do not agonise over the first test. You know least at the start; some early tests exist only to show that an idea was
  wrong.
- Choose plain, unsurprising example values, so a reader does not hunt for meaning in them. Prefer data built for the
  test over realistic data: the fewest, simplest values that exercise only the rule under test.
- Do not draw the target design first and test-drive toward it. Gather concrete examples first and let the abstraction
  come out of them; the next test is often just the next example. A small sketch of the messages for a new use case
  still helps before the first test; how small, and when to stop sketching: Message first in
  [dependencies-and-messages.md](dependencies-and-messages.md).
- An experienced designer who cannot yet see what the code should be may spike: explore without tests until the design
  is clear, then go back to writing it test-first. Newcomers go tests first; do not overrate your own skill. Keep the
  spike out of the commit and rebuild it test by test.
- There are two orders of work. Inside out starts from the domain objects and builds upward, the usual order of TDD.
  Outside in starts from the behaviour a user sees and works down, the usual order of BDD, and needs doubles for the
  objects that do not exist yet. Either way, each object is tested from the edge of its public interface.

## Choosing the next test

- Write the smallest test that proves the current code wrong. It is easier than the first, because you can define it
  against what already exists.
- Pin both ends of a run of alike cases early: after its first case, test its other end. Take the special cases after
  that, in their natural order. Each more specific test should push the code to be more general.
- Keep two hats apart: as the test writer you hold the whole plan in mind; as the code writer you act as if you know
  only what the tests so far demand.
- A test that is hard to write, or that needs heavy setup, is news about the design. Fix the design rather than piling
  on setup.

## Getting to green

Three ways to pass a test:

- **Fake It**: return the expected value as a literal. It pushes you to write the test that forces the real code.
- **Obvious Implementation**: write the real code, but only for a tiny step you are sure of. A wrong guess costs the
  feedback that small steps give.
- **Triangulate**: hold several failing tests at once and make them all pass with one change, so together they point to
  the general form. Another copy of a case you already have adds nothing; only a distinct case does.

By default, take the one-test-at-a-time route (described after the Triangulate steps below), and switch to Triangulate
only as its "Use it when" line says. Triangulate, as steps an agent can follow:

1. Write two or more failing tests whose cases differ in the way the general rule must handle.
2. Do not make them pass one by one with a literal each; look for the single change that passes all of them.
3. Make that change and run the tests. If one still fails, the general form is wrong or a case is missing: drop back to
   the last green and add the distinct case that tells the forms apart.

Use it when the one-test-at-a-time route, below, has passed the second case with a branch and the general form is still
unclear, and Fake It would only give you a pile of literals: write the next distinct cases as failing tests, then take
step 2. It is done when one piece of code, with no branch per test, passes every case, and a new distinct case passes
without editing it.

The one-test-at-a-time route reaches the same done line. Keep one failing test at a time. Pass the second case even with
a specific branch, then replace the literals and branches with the general form in small steps while every test is
green. The switch to Triangulate is the one time to hold several red tests.

```ts
// Before: one literal per test, each faked on its own
function shippingFee(kg: number): number {
  return kg === 2 ? 7 : 11; // passes the 2 kg and 4 kg tests only
}

// After: one change passes the 2 kg, 4 kg and 10 kg tests together
function shippingFee(kg: number): number {
  return 3 + 2 * kg;
}
```

Shameless Green carries triangulation over to the code: keep the concrete, duplicated cases until the abstraction is
plain, and do not chase DRY before every example is in.

- Generalise when many examples agree and you can name the abstraction. With only two examples, or when the abstraction
  would make the code harder to read, keep the duplication and ask what waiting costs and how soon more examples will
  come.
- A common misreading of red/green/refactor is to remove every duplication after every test. Squeezing it out that early
  disguises code that truly matches, so the real abstraction is harder to see later.
- Never copy an example that already exists in the code; call it. Duplication earns its place only by adding a new,
  independent example.

## What a test asserts

- Expected values are written out literally. A test that computes its expectation with logic like the production code's,
  or asserts that one method returns what another returns, is tied to how the code works and breaks when the code is
  restructured.
- Tests can repeat themselves more than production code; readability wins there.
- Keep one arrange, act, assert shape in every test.
- Signal arbitrary data: a prime number, or an absurdly large one, tells the reader that the exact value does not matter
  (the Prime Number Signal).

## When to stop

- Stop adding single-case tests once every distinct kind of case has one. Cover the gaps between them (order, the cases
  in the middle) with one broader test whose expected output is written in full.
- Delete a test that checks the same thing as another.
- Not everything needs its own test; test each fact once, in one place.

## Tests while restructuring

- Restructuring changes the code's shape but not what it does, so the tests stay unchanged and green after every step.
  Run them after each small edit; undo a step that turns them red and take a smaller one.
- If tests fail while the behaviour has not changed, they check how the code works rather than what it does. Stop, fix
  those tests on their own, then restart the restructuring. While a restructuring is under way, the tests stay as they
  are.
- Green tests do not prove an abstraction right: wrong code can pass them.
- When you extract a class, the outer tests protect the move; copy the code unchanged and put it to use before editing
  it. The new class then needs its own unit tests.
- Moving a test to a new home is itself a small restructuring: copy it, run, retarget, run, delete the original,
  checking the test count each time.
- Code you do not understand: pin its current behaviour with characterisation tests first, then restructure it in small
  steps on green. Procedure: [javascript-and-typescript.md](javascript-and-typescript.md), Characterisation tests.

- Changing a signature or a type that many places use, one green step at a time (the four stages per edit, Gradual
  Cutover, removing a parameter, accepting two kinds for a while; taking a long method apart with Method Object,
  extraction and clearing code junk): [changing-in-steps.md](changing-in-steps.md).

### Tidying the tests after the code has new owners

Use when restructuring has moved behaviour into new classes and the tests still sit where they were first written. This
is a debt that grows with each extraction: the outer tests slowly turn into integration tests that tell a reader the
wrong story.

1. Move each outer test that checks behaviour a new class now owns into that class's tests: move the first one by the
   copy-then-delete steps above, then the rest the same way as a group.
2. Delete outer tests that now check the same thing as another test, such as one written only to combine cases that have
   their own tests.
3. Rewrite the outer class's remaining tests so they no longer depend on its collaborator's real output; a double
   playing the collaborator's role (a fake) does this. Which kind to name in an answer:
   [testing-messages.md](testing-messages.md), Doubles.
4. Rename tests whose names were chosen before the domain was understood, so the names state the rule the tests now
   show; rename a test group in the same small green steps when its class is renamed. An out-of-date name can wait until
   other tests make the right one clear.
5. Give each special case its own test in the tests of the class that uses it, even where a broad test already covers
   it, so the tests tell a complete story. Whether the special-case classes get tests of their own is in Unit tests per
   class below.

Done: each test sits with the class that owns its behaviour, no two tests check the same thing, and each name says what
its test shows.

## Unit tests per class

- By default each class gets unit tests for its public messages. A small class that only one owner uses and no one
  outside can see may be tested through its owner; revisit that if it grows or gets reused.
- A factory's test checks only which object it returns for each input.
- Replace a collaborator with a double, a small stand-in written for tests (a fake), and keep the double honest with a
  role test that also runs against every real player of the role: [testing-messages.md](testing-messages.md), Doubles,
  which also says which kind of double to name.

## In JavaScript and TypeScript

- **The first red differs by tool.** A runner that strips types without checking them (Node.js `node --test`, Vitest,
  Jest with a transpile-only transform) runs the test and fails with a `ReferenceError` or `TypeError` for a missing
  class or method, as plain JavaScript does. `tsc --noEmit` reports the same gap before any test runs. Count either as
  the first red, and keep `tsc` in the loop so type errors do not hide behind green tests. Answer each such error with
  the least change that moves it along, until the test fails on its assertion; only then write the code that passes.
- **Fake It in TypeScript**: a literal return still has to satisfy the declared return type, which is fine; avoid `as`
  casts to fake a value the type does not allow.
- **Literal expectations**: a template literal holds multi-line expected output as it will print.
- **Equality**: Jest's and Vitest's `toBe` use `Object.is`; use `toEqual` or `toStrictEqual` for objects. `node:test`
  uses `assert.strictEqual` and `assert.deepStrictEqual`.
- **Tests not yet written**: `it.todo('...')` (Vitest, Jest) or `test('...', { todo: true })` (`node:test`) keeps the
  test list in the file; `it.skip` hides a written test, so unskip one at a time.
