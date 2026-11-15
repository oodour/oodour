---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

We'd like this library to talk to remotes over a second transport besides HTTP, for example one a user registers
for their own URL scheme. Today `fetch`, `push` and `getRemoteInfo` all work over HTTP. How would you fit a second
transport in? Don't change any code yet.
