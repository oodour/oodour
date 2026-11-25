---
tags: [behaviour, shape, conditionals]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

We keep forgetting a null check somewhere for logged-out visitors and it crashes in production every few weeks. These are a few of the places. How would you clean this up?

```ts
// header.ts
const greeting = session.user ? `Hi, ${session.user.firstName}` : 'Hi, guest';

// cart.ts
const discount = session.user ? session.user.loyaltyDiscount() : 0;

// recommendations.ts
const history = session.user ? session.user.recentPurchases(5) : [];

// analytics.ts
track('page_view', { userId: session.user ? session.user.id : 'anonymous' });
```

`session.user` is `User | null`, and `User` is a class with `firstName`, `id`, `loyaltyDiscount()` and `recentPurchases(n)`.
