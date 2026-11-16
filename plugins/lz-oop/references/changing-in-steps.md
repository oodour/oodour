# Changing code in steps

Use when a change would break many places at once: adding or removing a parameter, renaming a field that several
methods use, or changing the kind of value a method returns or accepts, in code that has several callers or several
implementors. Each practice below turns it
into small edits that each end on green, so the code could ship after any of them (*99 Bottles of OOP*). The
numbered steps are this plugin's restatement of the book's moves; the TypeScript examples are this plugin's own.

Contents: The four stages of one edit; Adding a parameter: Gradual Cutover; Removing a parameter; Renaming a field;
Accepting two kinds for a while; Taking a long method apart.

## The four stages of one edit

Use for every edit while you restructure (*99 Bottles of OOP*).

1. Make the new code parse.
2. Make it run, still unused.
3. Make the program use its result in place of the old code's.
4. Delete the old code.

After each stage run the tests. On red, undo and take a smaller step rather than debug. Change about one line at a
time; the steps may grow with practice and shrink again after a failure (the book). Once back on green, ask why the
step failed: a swap that should have been safe and was not often shows a rule of the code you had not understood
(Katrina Owen, the talk Succession, 2016). An editor-wide replace across
many lines counts as one step when one undo reverses it (the book). Finish the path you are on before you follow a
side idea (the book).

A way to reach stage 3 in one edit: put the new code above the old body and return its result early, so the old body
stays in place but can no longer run, then delete it as stage 4. A new form of a conditional goes in the same way:
above the old conditional, returning first, so it serves every case from that edit on. *99 Bottles of OOP* gives the
reason: the unreachable old code stays a quick way back to green if the new form fails, and it goes once the suite
is green. The book does both; its companion code does the first at several stages. ESLint's `no-unreachable` flags
the old code for that one step (this plugin's note).

Done: the old code is gone, the tests are unchanged and green, and every stage between was green too.

## Adding a parameter: Gradual Cutover

*99 Bottles of OOP* credits this name to Joshua Kerievsky and places it in his *Refactoring to Patterns*; this
plugin's own check of that book did not find it among the refactorings there. The name means moving callers to a new
form a few at a time while the code keeps working. Use when a method needs a new argument and its callers cannot all
change in one step, or when you are building one method to replace a special case and the general case. The steps
follow the walkthrough of adding an argument in *99 Bottles of OOP*, restated in this plugin's words.

1. Create the new method and have it return what the common case returns today.
2. Make the common case call it instead of doing the work itself. Green.
3. Give it the new parameter, optional for now, so a caller that leaves it out still gets the old behaviour.
4. Add the branch for the new value inside the method.
5. Make each caller pass the value explicitly, one at a time, running the tests after each.
6. Delete the code the method replaced, then make the parameter required.

Start from the common case. In JavaScript an omitted argument is `undefined` and falls into the common branch; if you
start from the special case instead, you need an explicit default value chosen so that case still holds (*99 Bottles
of OOP*). The default exists only for the cutover and goes in step 6.

```ts
// During: optional, so callers not yet moved still get dollars
function formatPrice(cents: number, currency?: Currency): string {
  return currency === 'EUR' ? `EUR ${cents / 100}` : `USD ${cents / 100}`;
}

// After: every caller passes the currency
function formatPrice(cents: number, currency: Currency): string { /* same body */ }
```

TypeScript: making the parameter required in step 6 makes `tsc` list every caller that still leaves it out.
JavaScript note: nothing lists them; search the callers, or add a temporary check that throws when the argument is
`undefined` and let the tests find the rest.

Done: every caller passes the argument, no default is left, and the replaced code is gone.

## Removing a parameter

Use when a method's argument now lives somewhere the method can read itself, for example in its own object after
an Extract Class (*99 Bottles of OOP*).

1. Inside the method, read the value from its new home instead of from the parameter.
2. Remove the argument from each caller.
3. Add a temporary check that throws when the method receives any argument at all. Run the tests; a failure points to
   a caller you missed. Fix it.
4. Once green, delete the check and the parameter.

JavaScript ignores extra arguments without a word, which is why step 3 exists (the book).

```js
// Step 3 in JavaScript: temporary, deleted in step 4
total(...args) {
  if (args.length > 0) {
    throw new Error('Invoice#total takes no arguments now');
  }

  return this.#lines.reduce((sum, line) => sum + line.amount, 0);
}
```

TypeScript: delete the parameter and `tsc` reports every caller that still passes one, so the compiler does step 3's
job. A caller typed loosely (`any`, a spread of `unknown[]`) escapes that check; keep the runtime check while such
callers exist.

Done: no caller passes the argument, the signature has no parameter, and the temporary check is gone.

## Renaming a field

Use when a field's name no longer says what it holds. *99 Bottles of OOP* and its companion code take these steps in
this order; the methods that assign the field in step 1, the pace in step 2 and the options-object case in step 4
are this plugin's.

1. Make the constructor, and every method that assigns the old field, fill the old field and the new one.
2. Move the readers to the new field method by method, every use inside a method at once, with a test run after
   each method.
3. Once nothing reads the old field, stop assigning it and delete it.
4. Rename the constructor parameter to match. Where callers pass it by name in an options object, accept both keys
   for a while (Accepting two kinds for a while, below), move the callers to the new key, then drop the old one.

TypeScript: when every reader and writer is in the project, make it one editor rename, which does steps 1 to 3 as one
undoable edit; take the steps when some sit outside it (a published API, JavaScript callers, access by a string key).
Once the old field is deleted, `tsc` reports every use you missed. JavaScript note: nothing lists missed uses; search
for the old name, bracket access with a string included.

Done: one field under the new name, no reader or writer of the old one, and the tests green after every step.

## Accepting two kinds for a while

Use when the kind of value a polymorphic method returns, or a constructor accepts, has to change, and several
implementors and callers depend on the old kind (*99 Bottles of OOP*, once for a return value and once for a
constructor argument).

1. Put the factory that builds the new kind where every implementor can reach it. When it sits in a client and the
   implementors are subclasses, move it onto the parent as a static method, switching its callers one at a time; a
   parent method that now returns a raw value can then call it and return the new kind instead (*99 Bottles of OOP*
   and its companion code). Keep the parent and its subclasses in one module while the parent's factory names them:
   split across files, the parent and each subclass import each other, and depending on which module loads first, a
   subclass can try to extend the parent before it exists and fail with a `ReferenceError` (this plugin's note).
2. Let the receiving side accept both kinds: convert an old one through the factory, pass a new one through.
3. Convert the implementors one at a time, green after each.
4. Convert the callers. Where you are unsure, keep the old line beside the new one until the tests pass, then delete
   the old one.
5. Delete the check that accepted both.

```ts
// During: both kinds accepted
stock(item: Sku | Product): void {
  const product = item instanceof Product ? item : productFor(item);
  this.#products.push(product);
}

// After: one kind
stock(product: Product): void {
  this.#products.push(product);
}
```

TypeScript: the union states the transition in the signature; removing the old kind from it in step 5 makes `tsc`
list every caller still sending it. JavaScript note: nothing lists them. When step 4 seems done, switch the check
in step 2 from converting to throwing on the old kind for a test run: each failing test names a sender left;
convert it, and repeat until the tests pass. Then switch the check to logging each old kind it converts, run the
code paths no test covers, and go to step 5 once the log stays empty (this plugin's suggestion). The book's own
check here only accepts and converts, and goes once all is green; it throws to find callers when it removes a
parameter, and throwing on the old kind is this plugin's use of that move.

Done: no union, no `instanceof` or `typeof` check for the old kind, and every implementor and caller deals only in
the new kind.

## Taking a long method apart

Use when one method has grown too long to read and you need to change it. Pin its behaviour first:
[javascript-and-typescript.md](javascript-and-typescript.md), "Characterisation tests". Katrina Owen takes such a
method apart in the talk Therapeutic Refactoring (2012) in fewer than thirty steps, each ending on green and each
committed on its own. The steps below restate hers; the TypeScript example is this plugin's.

1. If the method sits where it is hard to test, first move it into its own class (Replace Method with Method Object,
   which she credits to Martin Fowler's *Refactoring*): the constructor takes the method's argument, the body becomes
   a method with no parameter, and the old method only builds the object and calls it. Green. She notes that the
   usual reason for this move is a method with many temporaries you would otherwise pass around; hers had only its
   one argument, so only that became the object's state. Start the class private to the module, and give it a
   separate file once you want to test one of its extracted methods directly (this plugin's sequence; she gave the
   class a file of its own at once, and credits that kind of isolation with fast tests).
2. Extract one piece: add an empty method named for what the piece is, not how it is computed; copy the lines in.
   Where a local variable is built up across those lines, she prefers making the new method a query that returns its
   part over passing the variable in or storing it in a field. In the original, use the query's result and delete the
   temporaries nothing reads any more. Run the tests.
3. Choose the next piece. Her order was her own pick: the largest chunk first, then whichever line is now longest.
4. Remove what she calls code junk whenever you meet it, and sweep for the rest when the extractions are done: noise
   that adds nothing to understanding, such as comments that repeat or contradict the code (a misleading comment can
   go first), dead code kept for history, imports the code never uses, and work the language already does for you.
   Small pieces of it left in place pile up into the kind of method you started from. Do all of it in this change,
   before you add the new behaviour, so the review stays easy (this plugin's advice; she commits every step on its
   own).

```ts
// Step 1: the method moved into its own class; the old function only delegates
export function shippingCost(order: Order): number {
  return new ShippingCost(order).total();
}

class ShippingCost {
  #order: Order;

  constructor(order: Order) {
    this.#order = order;
  }

  total(): number {
    return this.#base() + this.#weightSurcharge() - this.#loyaltyDiscount(); // after steps 2 and 3
  }
  // #base, #weightSurcharge and #loyaltyDiscount are the extracted queries
}
```

When a conditional is too tangled to extract from at all, Sandi Metz rebuilds it instead in the talk All the Little
Things (2014): add a branch at the top that sends one category of input to a new, empty method; check that exactly
the tests for that category now fail; write new code until each of those tests is green in turn, then tidy that
method; repeat for each category; then delete the old conditional, never having had to understand it.

When one opaque block serves many cases at once and you cannot see where one case's part ends, Katrina Owen first
adds a temporary structure with one slot per case, so each case's part can be read and changed alone; it is
scaffolding, and goes once objects carry the cases (Succession, 2016). While its removal is planned, a review should
not report it as needless indirection (this plugin's note).

Done: each piece is a method named for what it does, the original reads as a few calls at one level of detail, no
unused temporaries or code junk remain, and every step between was green.
