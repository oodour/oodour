---
tags: [behaviour, review, variants]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Can you do a design review of this pull request before I merge it? It adds the enterprise plan.

```diff
--- a/src/billing/invoice.ts
+++ b/src/billing/invoice.ts
@@ -12,12 +12,16 @@ export class Invoice {
-  constructor(private readonly plan: 'basic' | 'pro', private readonly seats: number) {}
+  constructor(
+    private readonly plan: 'basic' | 'pro' | 'enterprise',
+    private readonly seats: number,
+    private readonly annual = false,
+  ) {}

   monthlyTotal(): number {
     switch (this.plan) {
       case 'basic':
         return this.seats * 8;
       case 'pro':
         return this.seats * 15;
+      case 'enterprise':
+        return this.annual ? this.seats * 25 * 0.85 : this.seats * 25;
     }
   }

   supportLevel(): string {
     switch (this.plan) {
       case 'basic':
         return 'community';
       case 'pro':
         return 'email';
+      case 'enterprise':
+        return 'dedicated';
     }
   }
 }
--- a/src/billing/limits.ts
+++ b/src/billing/limits.ts
@@ -3,6 +3,8 @@ export function maxProjects(plan: Plan): number {
   if (plan === 'basic') {
     return 3;
   }
+  if (plan === 'enterprise') {
+    return Infinity;
+  }
   return 20;
 }
```

The tests for basic and pro are unchanged and pass; I added two tests for enterprise totals.
