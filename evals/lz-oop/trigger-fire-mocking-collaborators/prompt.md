---
tags: [trigger, should-fire, testing, tuning]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

My unit tests for a class that talks to three collaborators are full of mocks and break whenever I refactor. Which of those messages should I actually assert on? We use Jest.
