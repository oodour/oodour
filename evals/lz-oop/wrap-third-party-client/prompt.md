---
tags: [behaviour, shape, dependencies]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Nine of our services each create their own payments SDK client and call it directly, like the one below. The vendor
is retiring `charges.create` in favour of a new `paymentIntents` API, so all nine have to change, and last year a
renamed option forced the same nine edits. How should we restructure this so the next vendor change hurts less?
Don't change any code yet.

```ts
import { PayCo } from '@payco/sdk';

export class SubscriptionRenewal {
  async renew(customerId: string, amountCents: number): Promise<string> {
    const payco = new PayCo(process.env.PAYCO_KEY ?? '', { apiVersion: '2024-06-01', timeoutMs: 8000 });
    const charge = await payco.charges.create({ customer: customerId, amount: amountCents, currency: 'eur' });
    return charge.id;
  }
}
```
