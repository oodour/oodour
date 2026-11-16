---
tags: [trigger, should-fire, review, holdout]
max_turns: 5
allowed_tools: [Read, Glob, Grep, Skill]
---

Is it a design smell that the constructor of my ReminderDispatcher class takes seven arguments? Some of them are always passed together.
