---
tags: [behaviour, shape, legacy, tests]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

I have to add a new discount type to this function next sprint. It has no tests, the person who wrote it has left,
and I'm scared to touch it. How should I go about changing it safely? Don't change any code yet; walk me through it.

```ts
import { format } from 'date-fns';
import { logger } from './logger';

export function invoiceTotal(invoice: any): number {
  // total
  let tot = 0;
  for (const l of invoice.lines) {
    let p = l.price * l.qty;
    if (l.discount) {
      if (l.discount.type === 'percent') {
        p = p - (p * l.discount.value) / 100;
      } else if (l.discount.type === 'fixed') {
        p = p - l.discount.value;
        if (p < 0) p = 0;
      }
    }
    // if (l.giftWrap) p += 2.5;
    tot = tot + p;
  }
  if (invoice.customer && invoice.customer.vip) {
    tot = tot * 0.95;
  }
  if (invoice.country === 'DK') {
    tot = tot * 1.25;
  } else if (invoice.country === 'SE' || invoice.country === 'NO') {
    tot = tot * 1.25;
  } else {
    tot = tot * 1.2;
  }
  const rounded = Math.round(tot * 100) / 100;
  return rounded;
}
```
