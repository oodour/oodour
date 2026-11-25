---
tags: [behaviour, judge, single-responsibility]
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Is this class well designed? It works and the tests pass, but every sprint someone has to edit it: last month for a
new VAT rule, this month because marketing changed the email layout. Don't change any code yet.

```ts
export class OrderConfirmation {
  #order: Order;
  #mailer: Mailer;

  constructor(order: Order, mailer: Mailer) {
    this.#order = order;
    this.#mailer = mailer;
  }

  async send(): Promise<void> {
    let net = 0;
    for (const line of this.#order.lines) {
      net += line.unitPrice * line.quantity;
    }
    const vat = this.#order.country === 'DK' ? net * 0.25 : net * 0.2;
    const total = net + vat;

    const rows = this.#order.lines.map((line) => `<tr><td>${line.name}</td><td>${line.quantity}</td></tr>`);
    const html = `<h1>Thanks, ${this.#order.customerName}!</h1><table>${rows.join('')}</table><p>Total: ${total.toFixed(2)}</p>`;

    await this.#mailer.send(this.#order.email, 'Your order', html);
  }
}
```
