# JavaScript and TypeScript forms of the ideas

The book teaches in JavaScript and the talks mostly in Ruby. Where an idea does not carry over to JavaScript or
TypeScript as stated, this file gives the form to use. **Everything here is this plugin's adaptation** unless the
book or a talk is credited: the plugin takes no TypeScript guidance from its sources, and the mappings, tools and
examples below are its own, checked against current TypeScript, Node.js, ESLint, Vitest, Jest and `node:test`
documentation.

Contents: Roles; Role tests in Vitest, Jest and node:test; Choosing a variant: the factory map; Absence: Null
Object, `?.` and `??`; Injecting collaborators; Testing outgoing messages; Commands and queries; Private state;
Parameter lists and options objects; Inheritance, mixins and built-in types; Immutable values, caching and the cost
of objects; Per-call state and `await`; Framework
code at the edges; Characterisation tests; Measuring complexity.

Examples are TypeScript in syntax that Node.js can strip (`erasableSyntaxOnly`, TypeScript 5.8 and later): no
`enum`, no runtime `namespace`, no constructor parameter properties. A JavaScript note follows where the languages
differ.

## Roles

A role is the set of messages a collaborator must answer. Ruby leaves roles implicit; TypeScript can name them.

- Name each role as a small `interface`, named for what it does, and type each dependency as the narrowest role the
  receiver uses. Structural typing accepts any object with those members; `implements` on a class or `satisfies` on
  a literal makes the compiler check a player where it is defined.
- `Pick<Concrete, 'a' | 'b'>` suits a one-off test double; once a second player is plausible, a named role
  interface is clearer.
- Types check the shape, not the behaviour. Keep a shared role test (below) that every player runs.
- Trust the player. Once the receiver depends on a role, it sends the message and asks nothing about who answers.
  A single `instanceof`, `typeof` or `in` check on that collaborator takes the trust back and ties the receiver to
  the classes again (Less, the Path to Better Design, 2011); in her view a dynamic language repays its looseness only
  when objects are reliable enough to be trusted without such checks (AMA, 2018). Checking the type of data at a
  boundary (JSON, user input) is a different job and stays (this plugin's note).

```ts
export interface Discount {
  apply(amount: number): number;
}
```

JavaScript note: there is no interface; the shared role test is the role's only record. With `checkJs`, a JSDoc
`@typedef` plus `@implements` gives the compile-time half.

## Role tests in Vitest, Jest and node:test

*99 Bottles of OOP* keeps a fake honest with a role test that every player of the role and the fake run, checking
that each answers the role's messages. In TypeScript the compiler already checks that; the shared test below asserts
behaviour instead, which is this plugin's extension. Export one function that registers the role's tests for any
player, and call it from each player's test file and from the fake's.

```ts
// discount-role.ts (Vitest; Jest is the same with its globals)
import { describe, expect, it } from 'vitest';
import type { Discount } from './discount.ts';

export function describeDiscountRole(makePlayer: () => Discount): void {
  describe('plays the Discount role', () => {
    it('never makes an amount negative', () => {
      expect(makePlayer().apply(7)).toBeGreaterThanOrEqual(0);
    });
  });
}

// percent-discount.test.ts
describeDiscountRole(() => new PercentDiscount(10));
```

- Inside one file, `describe.each` over `[name, makePlayer]` pairs does the same.
- `node:test`: import `describe` and `it` from `node:test` and assert with `node:assert/strict`
  (`assert.ok(player.apply(7) >= 0)`).
- `expectTypeOf<PercentDiscount>().toExtend<Discount>()` in a `*.test-d.ts` file (`vitest --typecheck`) is only
  worth it for generic role types; `implements` already fails the build.

## Choosing a variant: the factory map

*99 Bottles of OOP* weighs several factory forms in JavaScript, among them building a class name at run time,
variants that register themselves, and a key/value lookup, and leaves the choice to the situation. This plugin
starts, as [variants-and-conditionals.md](variants-and-conditionals.md) does, from a `switch` in one factory while
the kinds are few and change rarely: it is the easiest form to read. Once kinds keep arriving, or other code must
stay in step with the list, its default in TypeScript is the key/value lookup, built in one place, with the
`satisfies` check below.

```ts
type PlanKind = 'basic' | 'pro';

const planFor = {
  basic: (seats: number) => new BasicPlan(seats),
  pro: (seats: number) => new ProPlan(seats),
} satisfies Record<PlanKind, (seats: number) => Plan>;
```

`satisfies Record<PlanKind, ...>` makes the compiler demand an entry for every kind, so adding a kind without its
variant fails the build.

- Self-registration (each variant module calls `register()` on import) works only for modules something imports: a
  variant no one imports never registers, a type-only import registers nothing, and a bundler may drop the module
  when the package declares `"sideEffects": false`. Keep it for plugins added by other packages.
- JavaScript note: no `satisfies`; freeze the map and test that every kind in a `kinds` list has an entry.

## Absence: Null Object, `?.` and `??`

- With `strictNullChecks`, every `T | undefined` must be handled, so each `?.` and `??` is a visible decision. One
  check at a boundary (a lookup that can miss, optional configuration) is fine.
- When the same absence check repeats at several callers, or absence has a sensible default behaviour, decide once
  at the boundary and give callers a Null Object: a stand-in for the role whose methods do nothing or return a
  neutral value (the talk Nothing is Something, 2015).

```ts
const noDiscount: Discount = { apply: (amount) => amount };

const discount = discounts.get(code) ?? noDiscount;
const total = discount.apply(subtotal);
```

- JavaScript has two empty values. Use `undefined` for absence inside your code and convert `null` from JSON or the
  DOM at the boundary.
- ESLint's `complexity` rule counts each `?.`, `??` and default value as a branch, so scattered checks show in the
  score.
- JavaScript note: nothing flags a missed check unless `checkJs` with `strict` is on.

## Injecting collaborators

Injection is as cheap in JavaScript as in Ruby, but module imports invite hard-coding: a collaborator imported at
the top of a module and used inside a class is a hidden dependency, and tests then need `vi.mock` or `jest.mock`
to replace a whole module.

```ts
export class Checkout {
  #payments: PaymentGateway;

  constructor(payments: PaymentGateway = new CardGateway()) {
    this.#payments = payments;
  }

  pay(amount: number): void {
    this.#payments.charge(amount);
  }
}
```

- A default keeps call sites short while tests pass a fake. *99 Bottles of OOP* removes such defaults once callers
  pass the collaborator, because a default ties the class to its first setting; her article keeps one (SOLID Design
  Principles - Dependency Injection, 2009), and so does this plugin where
  [dependencies-and-messages.md](dependencies-and-messages.md) says, which also says when to drop it.
- Domain behaviour belongs on instances (the book). In JavaScript and TypeScript the same applies to `static` methods
  and to exported module functions that hold domain rules: a function that takes a record and decides for it cannot
  be replaced by injection, so a second variant becomes a branch inside it. A plain function is fine for a pure
  calculation with no variants in sight (this plugin's reading).
- Constructor parameter properties (`constructor(private payments: PaymentGateway)`) are not erasable; assign the
  field in the body.
- In a framework with its own injection (Angular providers and `inject()`, NestJS providers), use it there.
- JavaScript note: the same, without the types.

## Testing outgoing messages

Build the fake in the test, pass it in, and assert on the message it received. A mock function inside an injected
fake is fine; spying on a method of the object under test checks how it works rather than what it does.

- Vitest: `const charge = vi.fn<PaymentGateway['charge']>(); new Checkout({ charge }).pay(10);
  expect(charge).toHaveBeenCalledWith(10);`
- Jest: `const charge = jest.fn(); ... expect(charge).toHaveBeenCalledWith(10);`
- `node:test`: `const charge = mock.fn(); ... assert.deepStrictEqual(charge.mock.calls[0].arguments, [10]);`

Neither Vitest nor Jest documents a preference between fakes and spies; the preference for injecting a double that
plays the role, rather than stubbing a concrete class, is Sandi Metz's (the talk Get a Whiff of This, 2016). What to assert for each kind of message: [testing-messages.md](testing-messages.md).

## Commands and queries

Ruby returns the last expression implicitly, which blurs the line; JavaScript needs an explicit `return`.

- Type a command's return as `void` (or `Promise<void>`) and a query by its value; a query changes nothing.
- No lint rule enforces the separation. `@typescript-eslint/no-confusing-void-expression` stops a command's result
  being used as a value, and `@typescript-eslint/no-floating-promises` stops an async command being dropped. A query
  that changes state is caught by a test that calls it twice.

## Private state

- `#field` is enforced at run time and is erasable syntax. TypeScript's `private` is removed at compile time, and
  `obj['field']` or a cast still reaches it.
- The public messages are the stable surface; `#private` fields and unexported functions are free to change. A test
  that needs to reach a private field shows a collaborator waiting to be extracted.
- `#private` members cannot be spied on, and a `Proxy` around the instance cannot read them.
- JavaScript note: `#private` is plain ES2022; a leading underscore is only a convention.

## Parameter lists and options objects

- ESLint `max-params` (default 3) counts an options object as one parameter, so it cannot see a large options
  object. Treat each key as a parameter when judging an argument list; that limit is this plugin's judgement,
  enforced in review.
- Use an options object for optional settings with defaults. When the same few values travel together through
  several calls, make them one value object.
- Adding, removing or retyping a parameter that many callers use, in green steps, with what `tsc` checks and what
  JavaScript leaves to a temporary guard: [changing-in-steps.md](changing-in-steps.md).

## Inheritance, mixins and built-in types

- A mixin (a function that takes a class and returns a subclass, or `Object.assign` onto a prototype) is
  inheritance: the parent is fixed when the classes are built. It also costs typing work (an `any[]` constructor
  signature, anonymous class types). Prefer a collaborator passed in; keep mixins for small behaviour with no state.
  See [inheritance.md](inheritance.md).
- Wrap built-in types; do not extend them. Katrina Owen shows trouble from subclassing Ruby's `String` and builds a
  standalone object there instead (the talk Overkill, 2014); the general rule and the JavaScript details here are
  this plugin's extension of her example. A subclass of `Array` returns the subclass from `map`, `filter` and
  `slice` through `Symbol.species`, which breaks a constructor with its own signature, and a subclass of `String` is
  an object, not a string (`s === 'x'` is false).
- Never add methods to built-in prototypes: they are shared by all code and can clash with future standard methods.
  Use a domain object or a plain function.

## Immutable values, caching and the cost of objects

- *99 Bottles of OOP* prefers objects that do not change: they are easier to reason about and cheaper to test. It
  treats creating objects as free in a first version and adds no caching there: storing a result is easy, knowing
  when it is stale is not, and people guess wrong about speed, so write the plain version, measure, and optimise only
  the hot spot the profiler shows.
- TypeScript form: `readonly` fields and `ReadonlyArray<T>` (or `readonly T[]`) make the compiler refuse writes;
  `#private` fields with no setter keep the value fixed at run time. Return a new object from a method that would
  change one. `Object.freeze` adds a run-time check, shallow only.
- Measure in Node.js with `--cpu-prof` or `node --prof`, or the browser's performance panel, before caching anything.
- JavaScript note: no `readonly`; `Object.freeze` in the constructor, and `#private` fields, give the run-time half.

## Per-call state and `await`

JavaScript runs one thing at a time, but `await` lets calls interleave. Two overlapping calls that each store data
in an instance field before an `await` both read back the last value written. Keep per-call data in locals,
parameters or a per-call object. Katrina Owen makes the general point in the talk Overkill (2014): data that
belongs to one call stays out of fields, or a second caller overwrites it; the `await` case is this plugin's
JavaScript form of it.

## Framework code at the edges

Keep framework code (Express or Fastify handlers, Angular components, NestJS controllers, React components) at the
edges, translating requests and calling plain objects or functions that hold the domain rules. Check it by imports:
domain files import nothing from the framework, which ESLint `no-restricted-imports` or dependency-cruiser can
enforce.

## Characterisation tests

To pin the current behaviour of code before restructuring it, a snapshot of its output is the quickest tool:
`toMatchSnapshot` and `toMatchInlineSnapshot` in Vitest and Jest, `t.assert.snapshot` in `node:test`. Make the output
deterministic (fake time and randomness), never update a snapshot to make a failing test pass without reading the
difference, and replace snapshots with assertions that name the behaviour once you understand it. The practice of
pinning legacy behaviour with tests before refactoring is shown in full in Katrina Owen's talk Therapeutic
Refactoring (2012); the snapshot tools, fixed time and randomness, and replacing the snapshots later are this
plugin's advice.

## Measuring complexity

- ESLint core: `complexity` (default 20), `max-depth`, `max-lines-per-function`, `max-params`, `max-statements`.
- `eslint-plugin-sonarjs`: `sonarjs/cognitive-complexity` (licensed LGPL-3.0).
- No maintained tool computes the ABC metric for JavaScript or TypeScript; the older escomplex family has been idle
  since 2022.
- Churn: count how often each file appears in `git log --format= --name-only`.
