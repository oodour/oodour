---
tags: [behaviour, shape, duplication]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Finance just told us the VAT rate goes from 25% to 22% on the first of next month. How should I update this class for it?

```js
export class Basket {
  constructor(lines) {
    this.lines = lines;
  }

  total() {
    return this.lines.reduce((sum, line) => sum + line.price * line.quantity * 1.25, 0);
  }

  lineTotal(line) {
    return line.price * line.quantity * 1.25;
  }

  vatPortion() {
    const net = this.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    return net * 0.25;
  }
}
```
