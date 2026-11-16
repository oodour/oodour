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
  a literal makes the compiler check a player where it is defined. A dependency typed as a concrete class instead
  refuses every other player as soon as that class has a `#private` or `private` member: an object literal or a fake
  with the same public methods no longer fits (measured with TypeScript 6.0.3).
- `Pick<Concrete, 'a' | 'b'>` suits a one-off test double; once a second player is plausible, a named role
  interface is clearer.
- Types check the shape, not the behaviour. Keep a shared role test (below) that every player runs.
- Trust the player. Once the receiver depends on a role, it sends the message and asks nothing about who answers.
  A single `instanceof`, `typeof` or `in` check on that collaborator takes the trust back and ties the receiver to
  the classes again (Less, the Path to Better Design, 2011); in her view a dynamic language repays its looseness only
  when objects are reliable enough to be trusted without such checks (AMA, 2018). Checking the type of data at a
  boundary (JSON, user input) is a different job and stays (this plugin's note).
- Static typing. *Practical Object-Oriented Design* weighs static against dynamic typing for Ruby, before gradual
  typing such as TypeScript's was common. It doubts that compile-time checks catch much: a cast lets a wrong type
  through, and well-designed object code seldom meets type errors at run time. It treats a shared role test as the
  price a dynamic language pays for leaving the role unchecked. This plugin's adaptation for TypeScript: a role
  typed as an interface lets the compiler check every player's messages, so the shared role test is left to check
  behaviour; and a cast or a kind check on a collaborator gives up what both the role and the compiler offer.
  Under `strictNullChecks` the compiler also reports an unhandled `undefined`, which the book's Ruby-era remark
  about nil errors does not cover.

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
behaviour instead, which is this plugin's extension. In plain JavaScript no compiler checks the messages, so the
shared test also checks that each one exists (`expect(typeof player.apply).toBe('function')`). Export one function
that registers the role's tests for any player, and call it from each player's test file and from the fake's.

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

The `switch` the plugin starts from gets the same check from a `default` that states the kind is `never`:
`kind satisfies never` (TypeScript 4.9 and later), or the older forms, assigning it to a `never` variable or passing
it to a function whose parameter is `never`. While every kind has a `case`, nothing reaches the `default`; a kind
added to the union without a `case` makes that line a compile error that names the missing kind (TypeScript
Handbook, Narrowing). Keep the `throw`: a value from outside the program, such as parsed JSON, can still arrive
with a kind the type does not list.

```ts
function planFor(kind: PlanKind, seats: number): Plan {
  switch (kind) {
    case 'basic':
      return new BasicPlan(seats);
    case 'pro':
      return new ProPlan(seats);
    default:
      kind satisfies never;
      throw new Error(`No plan for ${String(kind)}`);
  }
}
```

To have every `switch` over a union checked without writing a `default` each time, turn on the typescript-eslint
rule `@typescript-eslint/switch-exhaustiveness-check`. It needs type information and is in none of the recommended
or strict configs, so enable it by name. Leave its `considerDefaultExhaustiveForUnions` option off (the default), so
that a `default` does not hide a kind added later.

When the kind arrives as the tag of a discriminated union (an API message, parsed JSON, a store action), call the
factory where the data arrives and pass the object on: later code sends messages to the `Plan` and never reads
`kind` again. A further `switch` over the union that does each kind's work is the smell described in Choosing
versus doing in [variants-and-conditionals.md](variants-and-conditionals.md), exhaustive or not.

```ts
type PlanRequest = { kind: 'basic'; seats: number } | { kind: 'pro'; seats: number };

function onPlanRequest(request: PlanRequest): Plan {
  return planFor(request.kind, request.seats);
}
```

- Self-registration (each variant module calls `register()` on import) works only for modules something imports: a
  variant no one imports never registers, a type-only import registers nothing, and a bundler may drop the module
  when the package declares `"sideEffects": false`. Keep it for plugins added by other packages.
- JavaScript note: no `satisfies` or `never`; freeze the map and test that every kind in a `kinds` list has an entry,
  and give a `switch` a `default` that throws.

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
interface CheckoutOptions {
  readonly payments?: PaymentGateway;
}

export class Checkout {
  readonly #payments: PaymentGateway;

  constructor({ payments = new CardGateway() }: CheckoutOptions = {}) {
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
- When injection must wait, create the collaborator on first use in one method, so the working methods never name
  its class (*Practical Object-Oriented Design* isolates instance creation this way). The TypeScript form, which
  also makes that method private, is this plugin's: a field `#gateway?: PaymentGateway` read only through
  `get #payments(): PaymentGateway { return (this.#gateway ??= new CardGateway()); }`.
- When only the receiver knows what its collaborator needs to be built, inject a factory function typed by what the
  receiver wants back, and call it once: `constructor(quoteFor: (seats: number) => Quote)`. Steps and sources:
  [dependencies-and-messages.md](dependencies-and-messages.md), Interfaces you do not own.
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
- Reading your own state. *Practical Object-Oriented Design* puts every field behind an accessor and has the class
  itself read through it, so that one method decides what the value means and a later change to that meaning
  touches one place. In JavaScript the outside half of that reason mostly falls away: a public field can become a
  getter later and no caller changes. Inside the class it still holds, so where a value's meaning could change or a
  subclass may redefine it, read it through a getter and let only the getter touch the `#field`. Keep that getter off
  the public interface: private (`get #total()`, over a field named otherwise) when only the class reads it,
  `protected` in TypeScript when a subclass may redefine it. *99 Bottles of OOP*'s own classes read their fields
  directly, so treat this as a choice for values like that, not a rule for every field (this plugin's reading of the
  two books).
- JavaScript note: `#private` is plain ES2022; a leading underscore is only a convention.

## Parameter lists and options objects

- *Practical Object-Oriented Design* treats a fixed argument order as a dependency of its own: every caller must
  know it. It prefers named arguments, which let callers pass them in any order and let the receiver add or drop
  parameters and defaults without breaking callers; a short list whose order is obvious and settled can stay
  positional (this plugin's example: `clamp(value, min, max)`), and existing code can move over gradually as it
  is touched. Its named arguments are Ruby's; this plugin's JavaScript form is one destructured options object,
  `function bookRoom({ start, end, timezone = 'UTC' }: BookingOptions)`.
- ESLint `max-params` (default 3) counts an options object as one parameter, so it cannot see a large options
  object. Treat each key as a parameter when judging an argument list; that limit is this plugin's judgement,
  enforced in review.
- Use an options object for optional settings with defaults. When the same few values travel together through
  several calls, make them one value object.
- Defaults: *Practical Object-Oriented Design* puts a plain default in the signature and has a default that takes
  code to work out come from a method of the receiver. In JavaScript the first is a destructuring default; the
  second is `options.limit ?? this.defaultLimit()`. Use `??`, not `||`, which also replaces a deliberate `0`, `''`
  or `false` (this plugin's note).
- JavaScript note: nothing reports a missing required key in an options object; destructuring quietly gives
  `undefined`. Check required keys where the object enters, or keep a required value as a positional parameter.
  TypeScript reports the missing key at compile time (this plugin's note).
- Across a class hierarchy, give each class its own options interface, the subclass's extending the parent's
  (`interface ExpressDeliveryOptions extends DeliveryOptions { readonly insuredValue?: number }`), rather than one
  open `Record<string, unknown>` that checks nothing (this plugin's form).
- Adding, removing or retyping a parameter that many callers use, in green steps, with what `tsc` checks and what
  JavaScript leaves to a temporary guard: [changing-in-steps.md](changing-in-steps.md).

### Raw structures from outside

Data often arrives in a shape the program does not control: CSV rows, arrays of positions from a library, loosely
typed JSON. *Practical Object-Oriented Design* keeps the knowledge of that shape in one place, a function or method
that turns each row into an object with named parts, so every other method sends messages to those objects instead
of indexing into `row[3]`. When the program owns the input, pass real objects in the first place. The example is
this plugin's:

```ts
type ReadingRow = readonly string[];

interface MeterReading {
  readonly meter: string;
  readonly kwh: number;
}

function toReading(row: ReadingRow): MeterReading {
  const [meter, , , kwhText] = row;
  const kwh = Number(kwhText);

  if (meter === undefined || kwhText === undefined || kwhText.trim() === '' || !Number.isFinite(kwh)) {
    throw new Error(`unreadable meter row: ${row.join(',')}`);
  }

  return { meter, kwh };
}
```

- `toReading` is now the only code that knows the column order. When the supplier adds a column, it is the only
  edit.
- The converter is also where each value is checked: `Number('')` is `0` and a missing cell gives `NaN`, so a
  converter that only maps would pass bad rows on quietly (this plugin's note).
- A tuple type such as `readonly [meter: string, site: string, date: string, kwh: string]` documents the positions,
  but every reader still indexes by position, so it is not this conversion (this plugin's note).
- The `MeterReading` record is the boundary case that [smells.md](smells.md) excepts from Data Class: data parsed at
  the edge may be a plain record, as long as nothing past the converter reads the raw row.

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
- A domain object that holds a list. *Practical Object-Oriented Design* weighs the options: a subclass of the
  built-in list hands callers every list method; a plain wrapper leaves callers stumbling over the list operations it
  lacks, and adding those one at a time never ends. The book settles on a wrapper that forwards a few list messages
  and gets the rest from Ruby's iteration module. JavaScript has no module that builds a list interface from one
  iteration method, so this plugin's form keeps the array private, makes the wrapper iterable, and forwards only the
  messages the domain uses:

  ```ts
  class Shipments implements Iterable<Shipment> {
    readonly #items: readonly Shipment[];

    constructor(items: Iterable<Shipment>) {
      this.#items = [...items];
    }

    *[Symbol.iterator](): Iterator<Shipment> {
      yield* this.#items;
    }

    get size(): number {
      return this.#items.length;
    }

    totalWeight(): number {
      return this.#items.reduce((sum, shipment) => sum + shipment.weightKg, 0);
    }
  }
  ```

  Callers get `for...of` and spread; for anything else they spread into an array (`[...shipments].filter(...)`).
  Type a parameter that only loops as `Iterable<Shipment>`, so an array and the wrapper both fit. Write the forwarders
  by hand: a `Proxy` that forwards every message cannot be typed without a cast and cannot reach `#private` members
  (this plugin's note). Moving off a list subclass is a change many callers feel, so make it in green steps: add the
  wrapper beside the subclass, port its callers singly and test after each, and delete the subclass when its last
  caller has moved, rather than switching the class in place and fixing whatever the compiler reports
  ([changing-in-steps.md](changing-in-steps.md); this plugin's note).
- Never add methods to built-in prototypes: they are shared by all code and can clash with future standard methods.
  Use a domain object or a plain function. Sandi Metz is more relaxed in Ruby: she adds methods to core classes in
  applications she controls, where she can foresee the other method names in play, and disapproves of it in code
  released for others to use (POODR with the Toronto Ruby Brigade, 2013; The Bike Shed, 2016), and *Practical
  Object-Oriented Design* allows it given a persuasive reason. This plugin
  keeps the stricter rule for JavaScript, its own position: every library loaded into the same page or process shares
  one prototype, so an application cannot foresee every name added to it, and a name added today can collide with a
  standard method added later.

### Hooks and required steps in TypeScript

Use when writing a parent class whose template method calls hooks (the conditions and the throwing parent:
[inheritance.md](inheritance.md), When a hierarchy is safe to keep). These forms are this plugin's; the mechanics
are from the TypeScript Handbook, Classes.

```ts
abstract class Invoice {
  total(): number {
    return this.subtotal() + this.fee();
  }

  protected abstract subtotal(): number;

  protected fee(): number {
    return 0;
  }
}
```

- Make a hook a method, public or `protected`, never `#private`. Were the hook `#fee`, a subclass's own `#fee`
  would be a second, separate member, and the parent would keep calling its own. The `#private` default in Private
  state is for state, not for hooks.
- Mark a required step `abstract` in an `abstract` parent. The compiler then refuses a subclass that leaves it out
  and refuses `new Invoice()`. Both modifiers are erased, so the class runs under Node.js type stripping. In plain
  JavaScript, keep the parent method that throws.
- Mark each hook a subclass supplies `override`, and turn on `noImplicitOverride`. Renaming a hook in the parent
  then breaks the build instead of leaving the subclass's method silently uncalled (TypeScript 4.3 release notes).
- *Practical Object-Oriented Design* has the parent's constructor ask its subclasses for defaults and for extra
  setup through hooks. In JavaScript and TypeScript the parent's constructor runs before the subclass's own fields
  exist, which splits that in two (measured with Node.js 24; the forms are this plugin's):
  - A hook that returns a value and reads nothing the subclass sets works from the parent's constructor:
    `this.#rate = options.rate ?? this.defaultRate();`, with each subclass's `defaultRate()` returning its own
    constant. Use `??`, not `||`, which would also replace a deliberate `0`.
  - A hook that stores state for the subclass breaks, and the compiler does not warn: a write to a subclass
    `#field` throws a `TypeError`, and a write to a plain declared field is reset to `undefined` once `super()`
    returns. Give such a subclass its own constructor that calls `super(options)` and then sets its fields. That
    brings back a `super` call, but only in a constructor, where both languages refuse to touch `this` before
    `super()` has run, so the forgotten `super` that hooks avoid cannot happen there (this plugin's reasoning).
    Subclasses that only supply hooks declare no constructor.
- Do not write a hook as an arrow-function property (`fee = () => 0`). It lives on each instance, not on the
  prototype, so `super.fee()` cannot reach it, and the parent's property hides a subclass method of the same name.

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

Use before restructuring code whose inputs and expected output you do not know, only that it works today. Katrina
Owen pins such a method in the talk Therapeutic Refactoring (2012); the steps restate hers:

1. Call the code with a stand-in for its input, and assert a value you know is wrong. The failure is the point: it
   shows what the code needs or what it returns.
2. While the failure is a missing input (the stand-in lacks something the code asks for), read the code at that line,
   learn what kind of value it wants, add it, and run again.
3. Once the failure is a plain mismatch, paste the actual value it reports in as the expected value. Green.
4. Choose inputs that make each transformation the code applies visible in the output, adjusting the expected value
   from each failure.
5. Add a case for every branch of every conditional, including fallbacks for missing values and each side of a
   threshold.
6. Where the behaviour looks wrong, pin it anyway as the current behaviour and ask whoever owns the requirement.

She stops once every line runs under some input and every branch is reached from a test. The result is a
regression suite and a record of today's behaviour, not a specification.

```ts
// Step 1, in Vitest (Jest is the same with its globals): the expected value is a placeholder
it('builds the label as it does today', () => {
  expect(shippingLabel({ name: 'Ada', zip: '1000' })).toBe('WRONG');
});
// node:test: assert.equal(shippingLabel(...), 'WRONG') from node:assert/strict
```

For output too long to paste, a snapshot does steps 1 and 3 at once: `toMatchSnapshot` and `toMatchInlineSnapshot` in
Vitest and Jest, `t.assert.snapshot` in `node:test`. Make the output deterministic (fake time and randomness), never
update a snapshot to make a failing test pass without reading the difference, and replace snapshots with assertions
that name the behaviour once you understand it. The snapshot tools, fixed time and randomness, and replacing the
snapshots later are this plugin's advice.

Done: every line you will touch runs under a test, every branch is reached, and the suite is green on the unchanged
code.

## Measuring complexity

- ESLint core: `complexity` (default 20), `max-depth`, `max-lines-per-function`, `max-params`, `max-statements`.
- `eslint-plugin-sonarjs`: `sonarjs/cognitive-complexity` (licensed LGPL-3.0).
- No maintained tool computed the ABC metric for JavaScript or TypeScript when this was written (2026); the older
  escomplex family had seen no release since 2022. Check before relying on that.
- Churn: count how often each file appears in `git log --format= --name-only`.
