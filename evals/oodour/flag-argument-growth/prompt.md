---
tags: [behaviour, shape, duplication]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

I need to add one more option so the customs form prints the address without the phone number. I was going to add a fifth boolean. Any better idea?

```js
// address-format.js, used by: invoice.js, shipping-label.js, customs-form.js, profile-page.js
export function formatAddress(address, international, forLabel, uppercaseCity, includePhone) {
  const lines = [address.name, address.street];
  const city = uppercaseCity ? address.city.toUpperCase() : address.city;
  lines.push(forLabel ? `${address.postcode} ${city}` : `${city} ${address.postcode}`);
  if (international) {
    lines.push(forLabel ? address.country.toUpperCase() : address.country);
  }
  if (includePhone && !forLabel) {
    lines.push(address.phone);
  }
  return lines.join(forLabel ? '\n' : ', ');
}
```

Each caller passes its own combination, for example `formatAddress(a, true, true, true, false)` on the shipping label.
