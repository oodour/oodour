---
tags: [trigger, should-fire, shape, holdout]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

We need to add a "refund" transaction type. The Transaction class has if (this.type === ...) checks in nearly every method. Where should the refund behaviour go?
