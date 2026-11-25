---
tags: [behaviour, review, decoy]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Please review the design of my last commit, "refactor: extract Money". The cart's tests drive it through the checkout
page; they did not change and still pass.

```diff
--- a/src/cart/cart.ts
+++ b/src/cart/cart.ts
@@ -1,20 +1,17 @@
+import { Money } from './money.ts';
+
 export class Cart {
   #lines: CartLine[] = [];

   add(line: CartLine): void {
     this.#lines.push(line);
   }

-  totalCents(): number {
-    return this.#lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
-  }
-
-  formattedTotal(): string {
-    const cents = this.totalCents();
-    return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
+  total(): Money {
+    return this.#lines.reduce((sum, line) => sum.plus(Money.cents(line.unitCents).times(line.quantity)), Money.zero());
   }
 }
--- /dev/null
+++ b/src/cart/money.ts
@@ -0,0 +1,25 @@
+export class Money {
+  readonly #cents: number;
+
+  private constructor(cents: number) {
+    this.#cents = cents;
+  }
+
+  static cents(cents: number): Money {
+    return new Money(cents);
+  }
+
+  static zero(): Money {
+    return new Money(0);
+  }
+
+  plus(other: Money): Money {
+    return new Money(this.#cents + other.#cents);
+  }
+
+  times(factor: number): Money {
+    return new Money(this.#cents * factor);
+  }
+
+  toString(): string {
+    return `${Math.floor(this.#cents / 100)}.${String(this.#cents % 100).padStart(2, '0')}`;
+  }
+}
--- a/src/cart/checkout-page.ts
+++ b/src/cart/checkout-page.ts
@@ -8,1 +8,1 @@
-    this.totalLabel.textContent = this.cart.formattedTotal();
+    this.totalLabel.textContent = this.cart.total().toString();
```
