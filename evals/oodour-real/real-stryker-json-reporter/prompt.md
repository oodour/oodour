---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Users keep asking for the mutation report as a plain JSON file they can feed to other tools, something like
`--reporters json` that writes `reports/mutation/mutation.json`. Where would that go in `packages/core`, and what
shape would you give it? Don't change any code yet.
