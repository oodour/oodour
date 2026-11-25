---
tags: [behaviour, review, dependencies, decoy]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Does this break the Law of Demeter? It has a lot of dots in a row.

```js
export function overdueTitles(loans, today) {
  return loans
    .filter((loan) => loan.dueOn < today)
    .map((loan) => loan.title.trim())
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 10);
}
```
