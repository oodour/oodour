---
tags: [behaviour, review, conditionals, decoy]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Our webhook endpoint parses each incoming payment event into this union and calls `ledgerEntry` on it. We now need a
`payout` kind, and a second function that picks which email to send for each kind. A teammate says that's fine: the
`satisfies never` check means the compiler names every switch we have to update, so we can't miss one. Do you agree,
or is there a better shape? Don't change any code yet.

```ts
type PaymentEvent =
  | { kind: 'charge'; amount: number; customerId: string }
  | { kind: 'refund'; amount: number; chargeId: string }
  | { kind: 'dispute'; amount: number; chargeId: string; reason: string };

export function ledgerEntry(event: PaymentEvent): LedgerEntry {
  switch (event.kind) {
    case 'charge':
      return { account: 'revenue', amount: event.amount };
    case 'refund':
      return { account: 'revenue', amount: -event.amount };
    case 'dispute':
      return { account: 'disputes', amount: -event.amount };
    default:
      event satisfies never;
      throw new Error('Unknown payment event');
  }
}
```
