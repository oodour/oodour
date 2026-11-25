---
tags: [behaviour, testing, javascript-and-typescript]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Our checkout code sends receipts through a `Notifier`, and we have three of them: `EmailNotifier`, `SmsNotifier`, and a
`FakeNotifier` that the checkout tests use. Last month someone changed `SmsNotifier` to reject empty messages, the fake
kept accepting them, and the checkout tests stayed green while production broke. We use TypeScript and Vitest. How do
we keep the fake honest as the real notifiers change?

```ts
export interface Notifier {
  send(to: string, message: string): Promise<void>;
}
```
