import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presetMessages } from '../testing/rule-messages.ts';
import { testRule, testRuleWithTypes } from '../testing/rule-testers.ts';
import { featureEnvy } from './feature-envy.ts';

test('the strict preset reports feature envy with a message that names the smell, the counts and the cures', () => {
  const messages = presetMessages(
    'strict',
    'feature-envy',
    'export class Cart { price(item) { return item.base + item.tax - item.discount + this.fee; } }\n',
    'cart.ts',
  );

  assert.deepEqual(messages, [
    "Stop and look: Feature Envy, this method uses 'item' 3 times and its own object 1. Look for what it asks of " +
      "'item'. Cure: Move Function, often to the class of 'item', with Extract Function first when only part of the " +
      'method envies; when it draws on several objects about equally, a new object may own that behaviour. Leave it ' +
      "where it is when this object plays a role, such as a strategy or visitor, that 'item' hands itself to. No " +
      'automatic change: which class should own the behaviour is a design decision no tool can make.',
  ]);
});

testRule(featureEnvy, {
  valid: [
    {
      name: 'a scratch array the method empties and fills again, which no method can move to',
      code: 'class Queue { flush(items) { let batch = []; batch.push(items); batch.push(items); batch.push(this.a); if (batch.length > 9) { batch = []; } return batch.length; } }',
    },
    {
      name: 'a local that holds a field of its own object, set on first use, whose uses count as its own',
      code: 'class Cache { read(key) { let entry = this.entry; if (!entry) { entry = this.entry = load(key); } return entry.a + entry.b + entry.c + entry.d; } }',
    },
    {
      name: 'a local that holds a field of its own object, whose uses count as uses of its own object',
      code: 'class Cart { total(item) { const cache = this.cache; return item.a + item.b + item.c + cache.x + cache.y; } }',
    },
    {
      name: 'an object literal the method builds for itself',
      code: 'class Report { row() { const out = {}; out.a = this.title; out.b = 1; out.c = 2; return out; } }',
    },
    {
      name: 'a method that uses its own object more than a parameter',
      code: 'class Cart { total(item) { return this.base + this.tax + item.price; } }',
    },
    {
      name: 'a method that uses a parameter only one time more than its own object',
      code: 'class Cart { total(item) { return item.base + item.tax + this.shipping; } }',
    },
    {
      name: 'a method that never uses its own object',
      code: 'class Cart { price(item) { return item.base + item.tax; } }',
    },
    {
      name: 'a method that uses a global more than its own object',
      code: 'class Cart { rounded() { return Math.round(this.total) + Math.floor(this.tax) + Math.ceil(1); } }',
    },
    {
      name: 'a local that holds a field of its own object',
      code: 'class Box { matches(width) { const cache = this.cache; return cache.width === width && cache.lines && cache.bg; } }',
    },
    {
      name: 'a local that holds a field of its own object through a type assertion',
      code: `
        class Effect {
          tick() {
            const state = this.state as Dissolve;
            return state.idx >= state.positions.length || state.positions[state.idx] === state.last;
          }
        }
      `,
    },
    {
      name: 'a built-in collection the method creates for itself',
      code: `
        class Loader {
          merge(paths) {
            const seen = new Set();
            for (const p of paths) { if (!seen.has(p)) { seen.add(this.resolve(p)); } }
            return seen.size;
          }
        }
      `,
    },
    {
      name: 'a built-in collection the method takes from a caller or else creates for itself',
      code: 'class Loader { load(paths, known) { const seen = known ?? new Set(); seen.add(this.root); return seen.has(paths) || seen.size; } }',
    },
    {
      name: 'a built-in collection behind a type assertion that the method creates when a caller gives none',
      code: 'class Loader { load(paths, known) { const seen = known ?? (new Set() as Set<string>); seen.add(this.root); return seen.has(paths) || seen.size; } }',
    },
    {
      name: 'a constructor parameter property, which is a field of its own object',
      code: 'class Cart { constructor(private readonly order: Order) { this.total = order.base + order.tax - order.discount; } }',
    },
    {
      name: 'a constructor parameter property with a default value',
      code: 'class Cart { constructor(private readonly order: Order = blank) { this.total = order.base + order.tax - order.discount; } }',
    },
    {
      name: 'two callback parameters that share a name, each used once',
      code: 'class Grid { columns() { this.log(); return [(x) => x.id, (x) => x.name]; } }',
    },
    {
      name: 'locals that hold its own object or destructure its fields',
      code: `
        class Cart {
          total() {
            const { items } = this;
            const self = this;
            return items.a + items.b + items.c + items.d + self.e + self.f + self.g + self.h;
          }
        }
      `,
    },
    {
      name: 'a scratch collection behind a type assertion',
      code: 'class Report { rows() { const out = [] as string[]; out.push(this.title); out.push(out.join()); return out.length + out.at(0); } }',
    },
    {
      name: 'a local that holds a field of its own object through an angle-bracket type assertion',
      code: 'class Report { rows() { const cache = <Cache>this.cache; return cache.a + cache.b + cache.c; } }',
    },
    {
      name: 'the parameters of a callback the method passes on',
      code: `
        class List {
          sorted(items) {
            return items.sort((a, b) => (this.ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
          }
        }
      `,
    },
    {
      name: 'a static method',
      code: 'class Cart { static from(row) { return this.build(row.items, row.owner, row.currency); } }',
    },
    {
      name: 'a method whose uses of super tip the balance toward its own object',
      code: 'class Cart extends Base { price(item) { return item.base + item.tax + this.fee + super.price(); } }',
    },
  ],
  invalid: [
    {
      name: 'a method that uses a parameter more than its own object',
      code: `
        class Cart {
          price(item) {
            return item.base + item.tax - item.discount + this.shipping;
          }
        }
      `,
      errors: [{ messageId: 'found', data: { name: 'item', count: 3, own: 1 } }],
    },
    {
      name: 'a parameter used through non-null and type assertions',
      code: 'class Cart { price(item: Item | undefined) { return item!.base + (item as Item).tax - item!.discount + this.fee; } }',
      errors: [{ messageId: 'found', data: { name: 'item', count: 3, own: 1 } }],
    },
    {
      name: 'a local variable used more than its own object',
      code: 'class Cart { total(id) { const order = this.orders.find(id); return order.base + order.tax - order.discount; } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: 'two names used equally often, each more than its own object',
      code: `
        class Cart {
          tax(item, rate) {
            return item.base * rate.vat + item.fee * rate.levy + item.duty * rate.excise + this.rounding;
          }
        }
      `,
      errors: [
        { messageId: 'found', data: { name: 'item', count: 3, own: 1 } },
        { messageId: 'found', data: { name: 'rate', count: 3, own: 1 } },
      ],
    },
    {
      name: 'only the most used of two envied names',
      code: 'class Cart { tax(item, rate) { return item.a + item.b + item.c + item.d + item.e + rate.x + rate.y + rate.z + this.r; } }',
      errors: [{ messageId: 'found', data: { name: 'item', count: 5, own: 1 } }],
    },
    {
      name: 'a local that holds a field of its own object, counted once per use as its own object',
      code: 'class Cart { total(item) { const cache = this.cache; return item.a + item.b + item.c + item.d + item.e + cache.x; } }',
      errors: [{ messageId: 'found', data: { name: 'item', count: 5, own: 2 } }],
    },
    {
      name: "a local that holds a field of another object, which is not the method's own",
      code: 'class Cart { total(item) { const order = item.order; return order.a + order.b + order.c + this.d; } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: 'a parameter with a default value, which is not a field of its own object',
      code: 'class Cart { price(item = blank) { return item.base + item.tax - item.discount + this.fee; } }',
      errors: [{ messageId: 'found', data: { name: 'item', count: 3, own: 1 } }],
    },
    {
      name: "a local that holds a caller's object, or else an empty object literal",
      code: 'class Cart { total(input) { const order = input ?? {}; return order.a + order.b + order.c + this.d; } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: "a parameter given an empty array in place of a missing value, which still holds the caller's object",
      code: 'class Cart { total(order) { order = order || []; return order.a + order.b + order.c + this.d; } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: "a loop variable given an empty array in place of a missing value, which still holds the collection's objects",
      code: 'class Cart { total(orders) { for (let order of orders) { order = order || []; return order.a + order.b + order.c + this.d; } } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: 'a local that held a field of its own object and now holds another object',
      code: 'class Cart { total(item) { let cache = this.cache; cache = item.order; return cache.a + cache.b + cache.c + cache.d + this.e; } }',
      errors: [{ messageId: 'found', data: { name: 'cache', count: 4, own: 2 } }],
    },
    {
      name: 'a parameter used through satisfies',
      code: 'class Cart { price(item) { return (item satisfies Item).base + (item satisfies Item).tax + (item satisfies Item).fee + this.fee; } }',
      errors: [{ messageId: 'found', data: { name: 'item', count: 3, own: 1 } }],
    },
    {
      name: 'a method whose class expression inside uses this, which counts for the inner method only',
      code: 'class Cart { price(item) { return item.a + item.b + item.c + this.d + new (class { run() { return this.x + this.y; } })().run(); } }',
      errors: [{ messageId: 'found', data: { name: 'item', count: 3, own: 1 } }],
    },
    {
      name: 'a method of a class expression inside another method, which envies its own parameter',
      code: 'class Cart { price() { return new (class { cost(part) { return part.a + part.b + part.c + this.d; } })(); } }',
      errors: [{ messageId: 'found', data: { name: 'part', count: 3, own: 1 } }],
    },
  ],
});

testRuleWithTypes(featureEnvy, {
  valid: [
    {
      name: 'a method that works through a string parameter, which no method can move to',
      code: 'class Label { prefix = ""; render(text: string) { return this.prefix + text.trim() + text.at(0) + text.length; } }',
    },
    {
      name: 'a method that works through a number parameter',
      code: 'class Price { digits = 2; format(amount: number) { return amount.toFixed(this.digits) + amount.toPrecision(3) + amount.valueOf(); } }',
    },
    {
      name: 'a method that works through an array parameter',
      code: 'class Total { base = 0; sum(prices: readonly number[]) { return this.base + prices.length + prices.reduce((a, b) => a + b, 0) + prices.indexOf(0); } }',
    },
    {
      name: 'a method that works through a tuple parameter',
      code: 'class Span { offset = 0; width(range: [number, number]) { return range.at(1)! - range.at(0)! + range.length + this.offset; } }',
    },
    {
      name: "a method that works through an object of the language's built-in library",
      code: 'class Clock { zone = 0; stamp(at: Date) { return at.getHours() + at.getMinutes() + at.getSeconds() + this.zone; } }',
    },
    {
      name: "a method that works through an object of a dependency's declarations",
      code: "import type { Linter } from 'eslint'; class Check { code = ''; run(linter: Linter) { return linter.verify(this.code, []).length + linter.getTimes().passes.length + linter.version.length; } }",
    },
    {
      name: 'a method that works through a library interface with a single member',
      code: 'class Job { tries = 0; run(pending: PromiseLike<number>) { pending.then(this.done); pending.then(this.log); return pending.then(this.next); } }',
    },
    {
      name: 'a method that works through a library type with one declared property',
      code: 'class Grid { pad = 0; span(cells: ArrayLike<number>) { return cells.length + cells.length * 2 + cells.length * this.pad; } }',
    },
    {
      name: 'a method that works through a string parameter that may be undefined',
      code: 'class Label { prefix = ""; render(text?: string) { return this.prefix + text?.trim() + text?.at(0) + text?.length; } }',
    },
    {
      name: 'a method whose own string field, read through a local, counts as its own object as it does without types',
      code: 'class Order { base = 0; tax = 0; discount = 0; extra = 0; } class Cart { label = ""; price(order: Order) { const label = this.label; return label.trim() + label.at(0) + label.length + label.concat("") + order.base + order.tax + order.discount + order.extra; } }',
    },
  ],
  invalid: [
    {
      name: 'a method that works through an object of a class the project declares',
      code: 'class Order { base = 0; tax = 0; discount = 0; } class Cart { fee = 0; price(order: Order) { return order.base + order.tax - order.discount + this.fee; } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: 'a method that works through an object of a project class that may be undefined',
      code: 'class Order { base = 0; tax = 0; discount = 0; } class Cart { fee = 0; price(order?: Order) { return order!.base + order!.tax - order!.discount + this.fee; } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: 'a method that works through a value that is either a project object or a string',
      code: 'class Order { base = 0; tax = 0; discount = 0; } class Cart { fee = 0; price(order: Order | string) { return (order as Order).base + (order as Order).tax - (order as Order).discount + this.fee; } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: "a method that works through a library utility type over a project class, whose fields are the project's",
      code: "class Order { base = 0; tax = 0; discount = 0; id = ''; } class Cart { fee = 0; price(order: Omit<Order, 'id'>) { return order.base + order.tax - order.discount + this.fee; } }",
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
    {
      name: 'a method that works through a project type that extends a library type',
      code: 'interface Shift extends Date { base: number; tax: number; } class Roster { fee = 0; cost(shift: Shift) { return shift.base + shift.tax + shift.getHours() + this.fee; } }',
      errors: [{ messageId: 'found', data: { name: 'shift', count: 3, own: 1 } }],
    },
    {
      name: 'a method that works through a value whose type the checker cannot tell',
      code: 'class Cart { fee = 0; price(order: any) { return order.base + order.tax - order.discount + this.fee; } }',
      errors: [{ messageId: 'found', data: { name: 'order', count: 3, own: 1 } }],
    },
  ],
});
