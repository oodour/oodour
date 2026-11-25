---
tags: [behaviour, audit, delegation]
max_turns: 20
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit]
---

This is a new repository, so start by creating these two files exactly as given.

`src/billing/subscription.ts`:

```ts
export type Plan = 'free' | 'team';

export class Subscription {
  readonly #plan: Plan;
  readonly #seats: number;

  constructor(plan: Plan, seats: number) {
    this.#plan = plan;
    this.#seats = seats;
  }

  monthlyPrice(): number {
    switch (this.#plan) {
      case 'free':
        return 0;
      case 'team':
        return 8 * this.#seats;
    }
  }

  storageGb(): number {
    switch (this.#plan) {
      case 'free':
        return 2;
      case 'team':
        return 100;
    }
  }

  supportLevel(): string {
    switch (this.#plan) {
      case 'free':
        return 'community';
      case 'team':
        return 'email';
    }
  }
}
```

`src/billing/renewal.ts`:

```ts
import { Subscription } from './subscription';
import { SmtpMailer } from '../mail/smtp-mailer';

export class Renewal {
  renew(subscription: Subscription, email: string): void {
    const mailer = new SmtpMailer('smtp.example.com', 587);
    mailer.send(email, `Your plan renews at ${subscription.monthlyPrice()} a month.`);
  }
}
```

Then add a third plan, `business`: 15 per seat, 1000 GB of storage, and `phone` support. One more case in each
switch is fine for now.

When that is done, audit the object-oriented design of `src/billing` and tell me what to refactor first. The
repository is trusted; it has no commit history yet.
