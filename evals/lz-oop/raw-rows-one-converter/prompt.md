---
tags: [behaviour, shape, data]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Our bank sends a payout export as CSV, and this class reads it. Next month the bank adds a column (a reference
field) in position 2, which shifts everything after it. How should I shape this class before that change lands?
Don't change any code yet.

```ts
export class PayoutReport {
  readonly #rows: string[][];

  constructor(csv: string) {
    this.#rows = csv.trim().split('\n').map((line) => line.split(','));
  }

  total(): number {
    return this.#rows.reduce((sum, row) => sum + Number(row[4]), 0);
  }

  largest(): string[] | undefined {
    return [...this.#rows].sort((a, b) => Number(b[4]) - Number(a[4]))[0];
  }

  forAccount(account: string): string[][] {
    return this.#rows.filter((row) => row[0] === account);
  }

  failed(): string[][] {
    return this.#rows.filter((row) => row[3] === 'FAILED');
  }

  currencies(): Set<string> {
    return new Set(this.#rows.map((row) => row[5]));
  }

  summary(): string {
    return `${this.#rows.length} payouts, ${this.failed().length} failed, total ${this.total()}`;
  }
}
```
