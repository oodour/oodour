---
tags: [behaviour, shape, conditionals]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

We clean up product codes from suppliers before we look them up. One supplier sends codes with spaces in them, another
sends them in lower case, so we have this. Now a third supplier sends codes like `ab 12 x` that have both problems, and
they come out wrong. I was going to add a branch for "has spaces and is lower case". Is that the right fix, or is there
a better shape? Don't change any code yet.

```ts
export function normaliseCode(code: string): string {
  if (code.includes(' ')) {
    return code.replaceAll(' ', '');
  } else if (code !== code.toUpperCase()) {
    return code.toUpperCase();
  } else {
    return code;
  }
}
```
