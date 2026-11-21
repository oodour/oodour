import { testRule } from '../testing/rule-testers.ts';
import { featureEnvy } from './feature-envy.ts';

testRule(featureEnvy, {
  valid: [
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
  ],
});
