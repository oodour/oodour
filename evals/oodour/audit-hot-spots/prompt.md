---
tags: [behaviour, audit]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Audit the object-oriented design of our `orders` package and tell me what to refactor first. I can't give you repo
access, so here is what I collected.

Commits per file in the last 12 months, and ESLint `complexity` (highest function in the file):

| File | Commits | Max complexity | Lines |
| --- | --- | --- | --- |
| src/orders/order-service.ts | 64 | 31 | 910 |
| src/orders/legacy-tax-table.ts | 1 | 27 | 640 |
| src/orders/order-repository.ts | 18 | 4 | 120 |
| src/orders/order-status.ts | 22 | 9 | 140 |
| src/orders/money.ts | 2 | 2 | 60 |

Notes:

- `order-service.ts` has `place`, `cancel`, `refund` and `ship`. Each switches on `order.channel` (`'web' | 'store' | 'marketplace'`) and most new features land here. It creates `new StripeClient()` and `new MailClient()` inline.
- `order-status.ts` has `label(status)`, `canCancel(status)` and `nextStatuses(status)`, each a switch on the same status union.
- `legacy-tax-table.ts` is a generated lookup with deep nesting; only `taxFor(region, amount)` is exported, it imports nothing, and nobody has touched it since 2023.
- The test suite for `order-service.ts` mocks six modules with `vi.mock`.
