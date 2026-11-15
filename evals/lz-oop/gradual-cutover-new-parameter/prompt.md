---
tags: [behaviour, shape, changing-in-steps]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

`formatPrice` is called from fourteen places across our app, and we now need it to handle EUR as well as USD, so it
needs a currency argument. We deploy from main several times a day and I don't want one giant commit that touches every
caller at once. How should I make this change?

```ts
export function formatPrice(cents: number): string {
  return `USD ${(cents / 100).toFixed(2)}`;
}
```
