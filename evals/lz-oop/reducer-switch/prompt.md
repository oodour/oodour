---
tags: [behaviour, shape, conditionals]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Our state library needs a reducer function, so we have this `switch`, and it keeps growing: we're about to add
`couponApplied` and `itemQuantityChanged` actions. Someone said a big `switch` is a code smell, but the library makes
us write a reducer, so is there any better shape? We're keeping the library. Don't change any code yet.

```ts
type CartAction =
  | { type: 'itemAdded'; item: CartItem }
  | { type: 'itemRemoved'; sku: string }
  | { type: 'cartCleared' };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'itemAdded': {
      const existing = state.items.find((i) => i.sku === action.item.sku);
      const items = existing
        ? state.items.map((i) => (i.sku === action.item.sku ? { ...i, quantity: i.quantity + 1 } : i))
        : [...state.items, { ...action.item, quantity: 1 }];

      return { ...state, items, total: totalOf(items) };
    }
    case 'itemRemoved': {
      const items = state.items.filter((i) => i.sku !== action.sku);

      return { ...state, items, total: totalOf(items) };
    }
    case 'cartCleared':
      return { ...state, items: [], total: 0 };
    default:
      action satisfies never;
      return state;
  }
}
```
