---
tags: [behaviour, judge, smells]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

We need a returns label next, which prints the same address and needs the same parcel weight. Before I copy anything
from this class: which code smells do you see in it, and which would you deal with first? Don't change any code yet.

```ts
export class ShippingLabel {
  readonly #order: Order;
  #weightKg?: number;

  constructor(order: Order) {
    this.#order = order;
  }

  prepare(): void {
    this.#weightKg = this.#order
      .lines()
      .reduce((sum, line) => sum + line.product().weightKg() * line.quantity(), 0);
  }

  address(): string {
    const customer = this.#order.customer();

    return [
      `${customer.firstName()} ${customer.lastName()}`,
      customer.street(),
      `${customer.postcode()} ${customer.city()}`,
      customer.country().toUpperCase(),
    ].join('\n');
  }

  postage(): number {
    if (this.#weightKg === undefined) {
      throw new Error('call prepare() first');
    }

    return this.#weightKg > 2 ? 9.5 : 4.5;
  }
}
```
