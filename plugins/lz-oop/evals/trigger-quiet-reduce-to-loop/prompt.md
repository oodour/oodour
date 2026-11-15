---
tags: [trigger, should-stay-quiet, functional, tuning]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

Convert this to a plain for loop, it is on a hot path: const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
