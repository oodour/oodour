---
tags: [behaviour, review, delegation]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

This diff is mine, written over the weekend. Could you review its design? It sends a text message along with the order
confirmation email.

```diff
--- a/src/orders/order-confirmation.ts
+++ b/src/orders/order-confirmation.ts
@@ -1,13 +1,20 @@
 import type { Mailer } from '../mail/mailer.ts';
 import type { Order } from './order.ts';
+import { SmsGateway } from '../vendor/sms-gateway.ts';
 
 export class OrderConfirmation {
   readonly #mailer: Mailer;
 
   constructor(mailer: Mailer) {
     this.#mailer = mailer;
   }
 
   send(order: Order): void {
     this.#mailer.deliver(order.customer.email, this.#body(order));
+
+    if (order.customer.phone !== undefined) {
+      const gateway = new SmsGateway(process.env.SMS_API_KEY ?? '', 'eu-west');
+
+      gateway.sendText(order.customer.phone, `Order ${order.number} is confirmed.`);
+    }
   }
```

The confirmation tests pass a fake mailer and still pass. I have not written a test for the text message yet.
