---
tags: [trigger, should-stay-quiet, functional, holdout]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

Write a pure TypeScript function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> with no dependencies.
