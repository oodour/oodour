---
tags: [behaviour, review, decoy]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Please review the design of my last commit, "refactor: ask the order about free shipping". All tests pass. A teammate
left a comment on it: "`canShipFree` is pointless indirection, it's a one-line pass-through. Inline it back." Should I?

```diff
--- a/src/orders/order.ts
+++ b/src/orders/order.ts
@@ -12,6 +12,10 @@ export class Order {
   subtotal(): Money {
     return this.#lines.reduce((sum, line) => sum.plus(line.total()), Money.zero());
   }
+
+  canShipFree(): boolean {
+    return this.shippingPolicy.allowsFreeShipping(this.subtotal());
+  }
 }
--- a/src/checkout/checkout-summary.ts
+++ b/src/checkout/checkout-summary.ts
@@ -20,1 +20,1 @@
-    const free = order.shippingPolicy.allowsFreeShipping(order.subtotal());
+    const free = order.canShipFree();
--- a/src/emails/order-confirmation.ts
+++ b/src/emails/order-confirmation.ts
@@ -31,1 +31,1 @@
-    if (order.shippingPolicy.allowsFreeShipping(order.subtotal())) {
+    if (order.canShipFree()) {
--- a/src/cart/cart-banner.ts
+++ b/src/cart/cart-banner.ts
@@ -9,1 +9,1 @@
-    this.showFreeShippingBadge = cart.order.shippingPolicy.allowsFreeShipping(cart.order.subtotal());
+    this.showFreeShippingBadge = cart.order.canShipFree();
```
