---
tags: [behaviour, tests, doubles]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

I'm adding unit tests to `RateTable`, which has none yet. It has 14 public methods. Three of them (`legacyRate`,
`rateV1` and `dumpCache`) are called only from an old script we deleted last year. Its collaborators are a `Clock`
(we have one implementation, `SystemClock`, which just wraps `Date.now()`) and `FxFeed`, which calls a remote
currency service over HTTP. What do I test, and what do I fake? Don't write the tests yet.
