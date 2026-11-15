---
tags: [behaviour, review, dependencies]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Anything you'd change in this design? The test setup for it has been getting painful.

```ts
export class ShippingQuote {
  constructor(private readonly order: Order, private readonly rates: RateTable) {}

  price(): number {
    const zone = this.order.customer.defaultAddress.country.shippingZone;
    const weight = this.order.items.reduce((sum, item) => sum + item.product.weightKg * item.quantity, 0);
    return this.rates.priceFor(zone, weight);
  }
}
```

```ts
// in the spec
const order = {
  customer: { defaultAddress: { country: { shippingZone: 'EU' } } },
  items: [{ quantity: 2, product: { weightKg: 1.5 } }],
} as Order;
```
