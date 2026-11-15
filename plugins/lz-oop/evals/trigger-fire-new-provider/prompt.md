---
tags: [trigger, should-fire, shape, tuning]
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

Our Checkout class switches on the payment provider in four different methods, and now we have to add a third provider (Klarna). How should I structure this so the next one is less painful? It is TypeScript.
