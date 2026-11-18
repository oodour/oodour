/**
 * One before/after pair shared by the codemod's test and the rule's test, so the round trip is pinned once:
 * the rule reports `before`, the codemod turns `before` into `after`, the rule passes `after`.
 */
export const before = {
  'order.ts': `
export class Customer { name(): string { return 'Ada'; } city(): string { return 'Oslo'; } }
export class Order {
  readonly #customer = new Customer();
  name(): string { return this.#customer.name(); }
  city(): string { return this.#customer.city(); }
}`,
  'invoice.ts': `
import { Order } from './order.ts';
export const label = (order: Order) => order.name() + order.city();`,
};

export const after = {
  'order.ts': '/* TODO: expected text, with a customer getter */',
  'invoice.ts': '/* TODO: expected text: order.customer.name() + order.customer.city() */',
};

/** Line of `export class Order` in before['order.ts'] (line 1 is the empty line after the backtick). */
export const target = { file: 'order.ts', line: 3 };
