---
tags: [trigger, should-fire, tdd, holdout]
max_turns: 5
allowed_tools: [Read, Glob, Grep, Skill]
---

My new test fails: parseDuration('1h30m') should return 5400, but parseDuration only handles plain seconds like '90s' so far. What's the least code I can write in TypeScript to get it green?
