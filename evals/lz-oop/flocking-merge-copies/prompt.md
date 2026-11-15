---
tags: [behaviour, refactor, duplication]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

These two functions are nearly the same and I'd like one of them. Both have tests that pass. How would you get from
two to one safely? Walk me through it rather than just showing the end result.

```ts
export function domesticLabel(parcel: Parcel): string {
  const lines = [parcel.recipient, parcel.street, `${parcel.postcode} ${parcel.city}`];
  if (parcel.fragile) {
    lines.push('FRAGILE');
  }
  return lines.join('\n');
}

export function internationalLabel(parcel: Parcel): string {
  const lines = [parcel.recipient, parcel.street, `${parcel.city} ${parcel.postcode}`, parcel.country.toUpperCase()];
  if (parcel.fragile) {
    lines.push('FRAGILE / FRAGILE');
  }
  return lines.join('\n');
}
```
