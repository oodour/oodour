---
tags: [behaviour, shape, dependencies]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

This class is a pain to test because it always hits the real exchange-rate API. How would you reshape it? Callers currently just do `new PriceConverter().toCurrency(amount, 'USD')` and I'd rather not touch all of them.

```ts
import { RatesApiClient } from './rates-api-client';

export class PriceConverter {
  async toCurrency(amountEur: number, currency: string): Promise<number> {
    const client = new RatesApiClient('https://rates.example.com', 5000);
    const rate = await client.latestRate('EUR', currency);
    return Math.round(amountEur * rate * 100) / 100;
  }
}
```
