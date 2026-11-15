---
tags: [behaviour, review, inheritance, decoy]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Our team guideline says "prefer composition over inheritance". Should I rewrite this to use composition?

```ts
export abstract class Report {
  render(rows: Row[]): string {
    return [this.header(), ...rows.map((row) => this.line(row)), this.footer()].join('\n');
  }

  protected footer(): string {
    return '';
  }

  protected abstract header(): string;
  protected abstract line(row: Row): string;
}

export class CsvReport extends Report {
  protected header() { return 'date,amount'; }
  protected line(row: Row) { return `${row.date},${row.amount}`; }
}

export class TextReport extends Report {
  protected header() { return 'Date        Amount'; }
  protected line(row: Row) { return `${row.date}  ${row.amount.toFixed(2)}`; }
  protected footer() { return `-- end --`; }
}
```

These two are the only subclasses, and nobody extends them further.
