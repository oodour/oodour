---
tags: [behaviour, judge, decoy]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

I've just finished restructuring our shipping code: the old `if`/`else` on the rate type became the classes below,
and all tests pass. A teammate wants to keep going before we merge: an abstract `BaseRate` class, a registry that
rates add themselves to on import, and a config file listing the active rates, "in case we add more carriers".
Nothing new is planned. How do I know when this kind of restructuring is done? Don't change any code yet.

```ts
export interface ShippingRate {
  priceFor(weightKg: number): Money;
}

export class FlatRate implements ShippingRate {
  readonly #price: Money;

  constructor(price: Money) {
    this.#price = price;
  }

  priceFor(): Money {
    return this.#price;
  }
}

export class WeightBandRate implements ShippingRate {
  readonly #bands: readonly { upToKg: number; price: Money }[];

  constructor(bands: readonly { upToKg: number; price: Money }[]) {
    this.#bands = bands;
  }

  priceFor(weightKg: number): Money {
    const band = this.#bands.find((b) => weightKg <= b.upToKg);

    if (band === undefined) {
      throw new Error(`No band for ${weightKg} kg`);
    }

    return band.price;
  }
}

export function rateFor(zone: Zone): ShippingRate {
  switch (zone.rateType) {
    case 'flat':
      return new FlatRate(zone.flatPrice);
    case 'weight-band':
      return new WeightBandRate(zone.bands);
  }
}
```
