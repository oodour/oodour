---
tags: [behaviour, review, delegation]
max_turns: 15
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

Here is `src/shipping/parcel.ts`:

```ts
export type Carrier = 'post' | 'courier';

export class Parcel {
  readonly #carrier: Carrier;
  readonly #weightKg: number;

  constructor(carrier: Carrier, weightKg: number) {
    this.#carrier = carrier;
    this.#weightKg = weightKg;
  }

  price(): number {
    switch (this.#carrier) {
      case 'post':
        return 4 + this.#weightKg * 1.2;
      case 'courier':
        return 9 + this.#weightKg * 0.8;
    }
  }

  deliveryDays(): number {
    switch (this.#carrier) {
      case 'post':
        return 5;
      case 'courier':
        return 2;
    }
  }

  label(): string {
    switch (this.#carrier) {
      case 'post':
        return `POST ${this.#weightKg} kg`;
      case 'courier':
        return `COURIER ${this.#weightKg} kg`;
    }
  }
}
```

Add a third carrier, `locker`: it costs 3 flat up to 5 kg and 6 above that, takes 3 days, and its label reads
`LOCKER <weight> kg`. Keep the diff as small as you can for today: one more case in each switch. Show me the whole
changed file, then give me a design review of the change you made before I commit it.
