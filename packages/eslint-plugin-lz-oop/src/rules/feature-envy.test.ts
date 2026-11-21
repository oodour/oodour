import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import plugin from '../index.ts';
import { testRule } from '../testing/rule-testers.ts';
import { featureEnvy } from './feature-envy.ts';

test('the strict preset reports feature envy with a message that names the smell, the counts and the cures', () => {
  const config = defineConfig({ files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } }, plugin.configs.strict);
  const messages = new Linter({ configType: 'flat' })
    .verify('export class Cart { price(item) { return item.base + item.tax - item.discount + this.fee; } }\n', config, 'cart.ts')
    .filter((message) => message.ruleId === `${plugin.meta.namespace}/feature-envy`)
    .map(({ message }) => message);

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
