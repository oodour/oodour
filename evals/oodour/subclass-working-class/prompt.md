---
tags: [behaviour, shape, inheritance]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

We are adding cold-chain parcels: they need a temperature range, a cooling surcharge and a different handling fee.
`Parcel` below is created in about forty places. My plan is `class ColdChainParcel extends Parcel`, so it reuses
the pricing and overrides `handlingFee()`. Is that a good start? Don't change any code yet.

```ts
export class Parcel {
  readonly #weightKg: number;
  readonly #distanceKm: number;

  constructor(weightKg: number, distanceKm: number) {
    this.#weightKg = weightKg;
    this.#distanceKm = distanceKm;
  }

  price(): number {
    return this.basePrice() + this.handlingFee() + this.insurance();
  }

  basePrice(): number {
    return 4 + this.#weightKg * 0.8 + this.#distanceKm * 0.01;
  }

  handlingFee(): number {
    return this.#weightKg > 20 ? 6 : 2;
  }

  insurance(): number {
    return 1.5;
  }

  label(): string {
    return `${this.#weightKg} kg, ambient, stackable`;
  }
}
```
