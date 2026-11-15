---
tags: [trigger, should-fire, tdd, holdout]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

This Vitest test is red: expect(romanize(4)).toBe("IV"), and romanize currently just repeats "I" n times. What is the smallest change that makes it pass?
