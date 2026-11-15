---
tags: [trigger, should-fire, review, tuning]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

OrderService.ts has grown to about 600 lines. It calculates prices, sends confirmation emails, writes to Postgres and formats PDFs. How would you split it up into objects?
