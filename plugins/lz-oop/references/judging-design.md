# Judging a design

Used by every skill in this plugin: by `lz-oop` for a question about one piece of code, by `lz-review` for each
change in a change set, and by `lz-audit` for each hot spot in a package.

1. Judge the code by what it costs to change, not by how it looks or by a metric alone. Ask what change is likely,
   and what this design would make that change cost. Code that works and will not change can stay as it is, however
   it looks; polishing it costs time and buys nothing (the talk Go Ahead, Make a Mess, hafentalks 2017;
   *99 Bottles of OOP* makes the same cost argument).
   The book makes one exception from a code's first version: loosen coupling early, because nobody can
   predict where change will land, and it costs least before a second user reuses the code. Other
   improvements that no requirement asks for yet spend time now on a hoped-for saving; judge each on
   its own odds.
   Weigh also what it costs a reader to follow the code today: every reader pays that, so it always counts.
   An extraction that saves future edits but makes the code harder to follow pays only when the
   saving is larger (the book).
   Then ask whether a quick read shows the domain: how many variants there are, which are alike and
   how, which stand apart, and what decides the next case (the book, which comes back to this question
   in a later refactoring). Code that answers these at a glance mirrors its problem.
2. Name each smell you see in the vocabulary of named smells and refactorings, and pair it with its usual cure
   (the book; the talk Get a Whiff of This, 2016). Rank them; the easiest well-understood one goes first (the book).
3. Say plainly when the design is fine. A conditional that only chooses which object to create, an
   inheritance tree that meets all four conditions of the talk All the Little Things (2014) together (shallow,
   narrow, its subclasses at the edges of the object graph, and each subclass using all it inherits), and duplicated
   lines that may still diverge are often the right call. Support that verdict with the
   specific properties of this code.
4. For each smell, open the leaf that covers it:
   - a conditional that switches on a kind, or a flag argument:
     [variants-and-conditionals.md](variants-and-conditionals.md);
   - duplication, or shared code bent by its callers: [duplication-and-abstraction.md](duplication-and-abstraction.md);
   - a collaborator created inside the class, a chain through other objects, a return value callers must check:
     [dependencies-and-messages.md](dependencies-and-messages.md);
   - a class hierarchy: [inheritance.md](inheritance.md);
   - tests that are hard to write, or that mock too much: [testing-messages.md](testing-messages.md);
   - a class you have not read yet, alike methods, a raw value standing for a domain idea, values that
     travel together, or a class carrying traces of where it was born: the checks below.
5. Keep each finding concrete: the file and lines, the smell's name, what change it makes expensive, the cure, and
   the first small step toward it.

## Smells and checks this leaf owns

### The Squint Test (*99 Bottles of OOP*)

Use it on a file or class you have not read yet, to find where to look first.

1. Zoom out, or lean back, until you see the code's form but cannot read it.
2. Look for changes in shape: indentation marks conditionals, and deeper indentation nested ones.
3. Look for changes in colour under syntax highlighting: many colours in one method mean it mixes
   levels of abstraction and will be hard to follow.
4. Look for methods that share one shape.

Done looks like: a short list of methods to read closely (the deep, the many-coloured, and the
groups that look alike), which the next check takes as input.

### Is a class hiding inside this one? (*99 Bottles of OOP*)

Use it when a class has several methods of the same shape, or after the Flocking Rules have produced
a family of alike methods. The book has a longer set of questions; a few of them, in the plugin's words:

1. Do several methods share a shape, and take the same argument?
2. Does that argument, wherever it appears under one name, mean the same concept?
3. Do their conditionals test the same kind of thing?
4. Does each method depend on the argument more than on the class it sits in?

Done looks like: the methods fall into two groups. The group that leans on the argument is the
hidden class; the argument is often a primitive (see the next check).

### Primitive Obsession, cured by Extract Class (*99 Bottles of OOP*)

The smell: a built-in value (a number, string or boolean) stands for a domain idea, so the raw value
travels around and its behaviour lives elsewhere. Each yes to the questions above adds weight to
that diagnosis. The cure:

1. Create a class named for the idea the primitive stands for, holding the value.
2. Copy every method that leans on the value into it in one change, unedited; nothing calls the
   copies yet, so the tests stay green. Then, one old method at a time, have it hand its work to
   an object of the new class, running the tests after each.
3. Change senders to create the new object and send it messages instead of passing the raw value.
4. Delete the old methods once no sender uses them. To drop the raw-value parameter from a method
   its senders call, see Removing a parameter in [changing-in-steps.md](changing-in-steps.md).

Done looks like: no method outside the new class branches on the raw value. Example (the plugin's
own):

```ts
// before: a raw string, and behaviour elsewhere
function shippingDays(country: string): number {
  return country === 'DK' ? 1 : 5;
}

// after
class Destination {
  readonly #country: string;

  constructor(country: string) {
    this.#country = country;
  }

  shippingDays(): number {
    return this.#country === 'DK' ? 1 : 5;
  }
}
```

### Consistency (*99 Bottles of OOP*)

Methods that have the same shape are easy to read and easy to change next. When a change would give
one method a shape unlike its siblings (an extra branch, a guard for a value that cannot occur),
treat that as a hint, not proof, that the abstraction is wrong, and reconsider what the method is
responsible for. Variation in form that serves no purpose hides a shape the methods share.

### More smells

- **Data Clump**: three or more values that keep travelling together through signatures and fields.
  The clump is usually a concept nobody named, and each place that handles it copies logic that can
  drift. Name it and give it a home: a class for a large clump, one combining method for a small one
  (*99 Bottles of OOP*).
- **A shortcut that relies on its caller**: an override or method that works only because of how one
  caller happens to use it ties the class to that caller and misleads readers about what varies.
  Fewer lines are not the goal; implement the domain's real concepts (the book).
- **Leftovers of an origin**: a class that grew beyond the place it was born in still carries that
  place's name, defaults and hard-coded values. Rename it for what it now does, and inject the
  leftover values as named collaborators or arguments. Each assumption a class makes about where it runs
  narrows where else it can run, and writing its tests is usually where such an assumption first gets in
  the way (the book). The book also drops the injected collaborator default that ties the class to its
  origin, and keeps value defaults only in a form that no longer depends on that origin; where this
  plugin keeps a collaborator default elsewhere, it follows her 2009 article on dependency injection
  instead (see Injecting collaborators in [dependencies-and-messages.md](dependencies-and-messages.md)).
