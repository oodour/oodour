---
tags: [behaviour, shape, conditionals]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

We need to support a new plan kind, "family" (5 seats, 1.8x the base price, 30-day trial). Where should it go? Here's the class as it stands; all its tests pass.

```ts
type PlanKind = 'solo' | 'team';

export class Plan {
  constructor(private readonly kind: PlanKind, private readonly basePrice: number) {}

  seats(): number {
    switch (this.kind) {
      case 'solo': return 1;
      case 'team': return 10;
    }
  }

  monthlyPrice(): number {
    switch (this.kind) {
      case 'solo': return this.basePrice;
      case 'team': return this.basePrice * 3;
    }
  }

  trialDays(): number {
    switch (this.kind) {
      case 'solo': return 14;
      case 'team': return 0;
    }
  }
}
```
