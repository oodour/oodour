# Changing code in steps

Use when a change would break many places at once: adding or removing a parameter, or changing the kind of value a
method returns or accepts, in code that has several callers or several implementors. Each practice below turns it
into small edits that each end on green, so the code could ship after any of them (*99 Bottles of OOP*). The
numbered steps are this plugin's restatement of the book's moves; the TypeScript examples are this plugin's own.

Contents: The four stages of one edit; Adding a parameter: Gradual Cutover; Removing a parameter; Accepting two kinds
for a while.

## The four stages of one edit

Use for every edit while you restructure (*99 Bottles of OOP*).

1. Make the new code parse.
2. Make it run, still unused.
3. Make the program use its result in place of the old code's.
4. Delete the old code.

After each stage run the tests. On red, undo and take a smaller step rather than debug. Change about one line at a
time; the steps may grow with practice and shrink again after a failure (the book). An editor-wide replace across
many lines counts as one step when one undo reverses it (the book). Finish the path you are on before you follow a
side idea (the book).

Done: the old code is gone, the tests are unchanged and green, and every stage between was green too.

## Adding a parameter: Gradual Cutover

Joshua Kerievsky's name for moving callers to a new form a few at a time while the code keeps working
(*99 Bottles of OOP*). Use when a method needs a new argument and its callers cannot all change in one step, or when
you are building one method to replace a special case and the general case.

1. Create the new method and have it return what the common case returns today.
2. Make the common case call it instead of doing the work itself. Green.
3. Give it the new parameter, optional for now, so a caller that leaves it out still gets the old behaviour.
4. Add the branch for the new value inside the method.
5. Make each caller pass the value explicitly, one at a time, running the tests after each.
6. Delete the code the method replaced, then make the parameter required.

Start from the common case. In JavaScript an omitted argument is `undefined` and falls into the common branch; if you
start from the special case instead, you need an explicit default value chosen so that case still holds (the book). The
default exists only for the cutover and goes in step 6.

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

## Accepting two kinds for a while

Use when the kind of value a polymorphic method returns, or a constructor accepts, has to change, and several
implementors and callers depend on the old kind (*99 Bottles of OOP*, once for a return value and once for a
constructor argument).

1. Put the factory that builds the new kind where every implementor can reach it.
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
list every caller still sending it. JavaScript note: nothing lists them; this plugin suggests letting the check in
step 2 log the old kind while you convert, so the log shows who is left. It must be gone at the end.

Done: no union, no `instanceof` or `typeof` check for the old kind, and every implementor and caller deals only in
the new kind.
