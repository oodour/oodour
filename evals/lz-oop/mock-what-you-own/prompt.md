---
tags: [behaviour, tests, doubles]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Is this a good test? It passes, but it breaks every time we upgrade the Stripe SDK, and I'm not sure it proves much.
Don't change any code yet; tell me what you would do differently.

```ts
import { describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import { Money } from './money';
import { RefundService } from './refund-service';

vi.mock('stripe');
vi.mock('./money');

describe('RefundService', () => {
  it('refunds a charge', async () => {
    const create = vi.fn().mockResolvedValue({ id: 're_1', amount: 1500, status: 'succeeded' });
    vi.mocked(Stripe).mockImplementation(() => ({ refunds: { create } }) as unknown as Stripe);
    vi.mocked(Money).mockImplementation(() => ({ cents: () => 1500 }) as unknown as Money);

    const result = await new RefundService().refund('ch_1', new Money(15, 'EUR'));

    expect(create).toHaveBeenCalledWith({ charge: 'ch_1', amount: 1500 });
    expect(result.amount).toBe(1500);
    expect(result.status).toBe('succeeded');
  });
});
```

`RefundService` does `new Stripe(process.env.STRIPE_KEY)` in its constructor and returns what `refunds.create`
returns. `Money` is our own small value class with no I/O.
