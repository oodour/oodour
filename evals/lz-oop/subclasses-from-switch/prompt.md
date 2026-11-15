---
tags: [behaviour, shape, inheritance, conditionals]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Every method of this class switches on the plan, and we keep adding plans. The team has decided to replace the
switches with subclasses, one per plan. The tests are green. How do we get from here to there without breaking
anything along the way? Walk me through it; don't change any code yet.

```ts
export type Plan = 'free' | 'team' | 'enterprise';

export class Subscription {
  readonly plan: Plan;
  readonly seats: number;

  constructor(plan: Plan, seats: number) {
    this.plan = plan;
    this.seats = seats;
  }

  monthlyPrice(): number {
    switch (this.plan) {
      case 'team':
        return this.seats * 8;
      case 'enterprise':
        return Math.max(500, this.seats * 12);
      default:
        return 0;
    }
  }

  storageGb(): number {
    switch (this.plan) {
      case 'team':
        return 100 * this.seats;
      case 'enterprise':
        return 10_000;
      default:
        return 5;
    }
  }

  supportLabel(): string {
    switch (this.plan) {
      case 'enterprise':
        return 'Dedicated';
      default:
        return 'Community';
    }
  }
}

// Callers do: new Subscription(account.plan, account.seats)
```
