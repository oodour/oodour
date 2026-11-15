---
tags: [behaviour, testing]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

How should I unit-test `place()`? We use Vitest. Please sketch the tests.

```ts
export class Checkout {
  constructor(
    private readonly pricing: Pricing,       // totalFor(cart): Money
    private readonly inventory: Inventory,   // reserve(items): void
    private readonly mailer: Mailer,         // sendReceipt(email, receipt): void
  ) {}

  place(cart: Cart, email: string): Receipt {
    const total = this.pricing.totalFor(cart);
    this.inventory.reserve(cart.items);
    const receipt = this.buildReceipt(cart, total);
    this.mailer.sendReceipt(email, receipt);
    return receipt;
  }

  private buildReceipt(cart: Cart, total: Money): Receipt {
    return { lines: cart.items.map((item) => item.sku), total };
  }
}
```
