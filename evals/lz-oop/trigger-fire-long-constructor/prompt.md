---
tags: [trigger, should-fire, review, holdout]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

Is it a design smell that the constructor of my NotificationScheduler class takes seven arguments? Some of them are always passed together.
