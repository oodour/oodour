---
tags: [behaviour, shape, dependencies]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

A reviewer wrote on our pull request that `Checkout` knows too much about `Inventory`. What exactly does it know, and
what should this code look like instead? Don't change any code yet.

```ts
export class Checkout {
  readonly #inventory: Inventory;

  constructor(inventory: Inventory) {
    this.#inventory = inventory;
  }

  place(order: Order): void {
    const stock = this.#inventory.stockLevels();

    for (const line of order.lines) {
      const level = stock.get(line.sku) ?? 0;

      if (level < line.quantity) {
        throw new Error(`Not enough ${line.sku}`);
      }
    }

    for (const line of order.lines) {
      this.#inventory.reserve(line.sku, line.quantity);
    }

    this.#inventory.markReserved(order.id);
  }
}
```
