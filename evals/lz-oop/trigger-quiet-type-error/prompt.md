---
tags: [trigger, should-stay-quiet, non-design, tuning]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

In Firefox my class throws `TypeError: can't access property "map", this.items is undefined` in this.items.map when the constructor runs. this.items is assigned in an async init() method. What is wrong?
