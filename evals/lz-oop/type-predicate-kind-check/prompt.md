---
tags: [behaviour, shape, conditionals]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

A colleague wants to make this type-safe with type predicates such as `isOrder(x): x is Order` and
`isSubscription(x): x is Subscription`, replacing the `instanceof` checks. Good idea? Don't change any code yet.

```ts
export const refundRules = {
  isRefundable(item: Order | Subscription, today: Date): boolean {
    if (item instanceof Order) {
      return !item.isShipped() && daysBetween(item.placedOn, today) <= 14;
    }

    if (item instanceof Subscription) {
      return daysBetween(item.renewedOn, today) <= 3;
    }

    return false;
  },
};
```
