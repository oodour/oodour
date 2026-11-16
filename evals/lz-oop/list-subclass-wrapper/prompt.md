---
tags: [behaviour, shape, inheritance]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

I wrote `class LineItems extends Array<LineItem>` so an order's items can have `total()`. Now `filter` behaves
oddly in places (we pass the items to its constructor), and a teammate wants `sortByPrice`, `first` and `isEmpty`
on it too. Where does this end? Don't change any code yet.

```ts
export class LineItems extends Array<LineItem> {
  constructor(items: LineItem[]) {
    super(...items);
  }

  total(): number {
    return this.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
```
