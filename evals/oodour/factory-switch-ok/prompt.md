---
tags: [behaviour, review, conditionals, decoy]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

A colleague's review comment says "switch statements are a code smell, please replace this". Do I need to change it?

```ts
import { CsvExporter } from './csv-exporter';
import { JsonExporter } from './json-exporter';
import { XlsxExporter } from './xlsx-exporter';
import type { Exporter } from './exporter';

export function exporterFor(format: 'csv' | 'json' | 'xlsx'): Exporter {
  switch (format) {
    case 'csv': return new CsvExporter();
    case 'json': return new JsonExporter();
    case 'xlsx': return new XlsxExporter();
  }
}
```

The three exporters each implement `export(rows: Row[]): Uint8Array`, and nothing else in the codebase switches on the format.
