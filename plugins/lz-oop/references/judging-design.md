# Judging a design

Used by every skill in this plugin: by `lz-oop` for a question about one piece of code, by `lz-review` for each
change in a change set, and by `lz-audit` for each hot spot in a package.

Contents: steps 1-6; Smells and checks this leaf owns: The Squint Test; Is a class hiding inside this one?; Primitive
Obsession; Consistency; Does it do one job?; More smells.

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
   For a smell's name, how to spot it, and the leaf that holds its cure, Read [smells.md](smells.md).
3. Say plainly when the design is fine. A conditional that only chooses which object to create, an
   inheritance tree that meets all four conditions of the talk All the Little Things (2014) together (shallow,
   narrow, its subclasses at the edges of the object graph, and each subclass using all it inherits), and duplicated
   lines that may still diverge are often the right call. Support that verdict with the
   specific properties of this code.
4. For each smell, Read the file that covers it before you recommend a cure. This leaf names the smells; the cures,
   their steps and their exceptions are in those files, not here:
   - a conditional that switches on a kind, or a flag argument:
     [variants-and-conditionals.md](variants-and-conditionals.md);
   - duplication, or shared code bent by its callers: [duplication-and-abstraction.md](duplication-and-abstraction.md);
   - a collaborator created inside the class, a chain through other objects, a sender that walks a collaborator
     through its steps, a return value callers must check: [dependencies-and-messages.md](dependencies-and-messages.md);
   - a class hierarchy: [inheritance.md](inheritance.md);
   - tests that are hard to write, or that mock too much: [testing-messages.md](testing-messages.md);
   - a long method or function: Taking a long method apart in [changing-in-steps.md](changing-in-steps.md);
   - a class or method that does more than one job: Does it do one job? below;
   - a class you have not read yet, alike methods, a raw value standing for a domain idea, values that
     travel together, or a class carrying traces of where it was born: the checks below.
5. Keep each finding concrete: the file and lines, the smell's name, what change it makes expensive, the cure, and
   the first small step toward it.
6. To decide whether a restructuring can stop, check the code against TRUE, from the talk Less, the Path to Better
   Design (2011), where she grades each refactoring step by it. Transparent: what an edit affects is easy to see.
   Reasonable: a change costs in proportion to what it is worth. Usable: the code can serve in a new setting without
   being copied. Exemplary: the easiest way for the next developer to extend it is also a good way, so imitating it
   spreads good habits. Code that meets all four is good enough; stop there. She presents the four as the reverse of
   Robert Martin's symptoms of rotting design.

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
that diagnosis. The idea need not be a physical thing: an object can stand for a concept with no physical form, such
as a number with rules of its own, and such concepts often sit in the interactions between the obvious objects (the
book). Rows that arrive from outside as arrays of positions or loose records are the same problem at the edge of the
program: see Raw structures from outside in [javascript-and-typescript.md](javascript-and-typescript.md). The cure:

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

### Does it do one job? (Single Responsibility)

Use it on a class or method that a change made longer, or that is hard to name.

Why it matters, from *Practical Object-Oriented Design*: a class that serves several purposes cannot be reused for
just one of them. Whoever needs one purpose must take the whole class, along with changes made for purposes they do
not share, or copy the part they need.

1. Describe it in one sentence. A sentence that needs "and" suggests two jobs; one that needs "or" suggests two
   unrelated jobs (the talk SOLID Object-Oriented Design, 2009, and *Practical Object-Oriented
   Design*; *99 Bottles of OOP* raises the same suspicion when describing a method takes an "and"). Treat the
   sentence as a guide, not a law: in her POODR talk with the Toronto Ruby Brigade (2013) a class is good enough when
   one sentence covers everything in it.
2. Put each of its methods to the class as a question it is asked, in plain words ("invoice, what is your due
   date?" reads well; "invoice, what is the customer's postcode?" does not). A question that sounds odd for the class
   points to a method that belongs elsewhere (*Practical Object-Oriented Design*; the example is this plugin's).
3. Look for cues in the code:
   - a blank line inside a method that marks a change of topic (*99 Bottles of OOP* names it as a smell);
   - a method that relies on only some of the class's fields, and may belong with those fields in a new class (her
     public example-code repositories, poodr and poodr2);
   - a method that loops over a collection and also does the work for each item; split it into one method that only
     loops and one that handles a single item (the same repositories; *99 Bottles of OOP* and *Practical
     Object-Oriented Design* both argue for the looping-only form).
4. Ask whether its parts change at one pace. Parts that change at different rates belong apart (the talk SOLID
   Object-Oriented Design, 2009). The 2013 Toronto talk loosens this: one reason to change, and parts that change
   at the same moment, are rules of thumb for cohesion, not strict conditions.
5. Ask whether it could be two things, and what each would be. A believable answer means it may hold too much, and
   the split is worth trying; inline it again if the result reads worse (Katrina Owen, the talks Overkill, 2014, and
   Succession, 2016). Length is not the test: a method of a few lines can still serve unrelated ends.

The cure, one job at a time, with the tests green after each step: break the code into small methods, then move a
job into a new class and inject an instance of it (the talk All the Little Things, 2014, goes from small methods to
small objects; the talk SOLID Object-Oriented Design, 2009, extracts and injects one duty at a time). When to move
methods out is this plugin's reading: when a group of them leans on the same few values. For the steps of
Extract Class, see Primitive Obsession above. *99 Bottles of OOP* argues for leaving a short method that works alone
while nothing asks for a change, yet treats the split as a judgment call: an unrequested change is a bet, and one
that loosens coupling is worth making even then. Weigh the split against the leaf's opening step 1.

When you are already changing the class and the second job is plainly separate, split it now: *Practical
Object-Oriented Design* warrants a separate class once enough is known, and limiting that to code under change is
this plugin's reading, which follows *99 Bottles of OOP*. When you are in doubt and nothing yet asks for it to move,
contain it rather than extract it: give it its own methods inside the class, or a small class in the same module
that nothing outside imports, so that moving it out is cheap once a change request supplies the missing facts
(*Practical Object-Oriented Design*). The same book weighs the wait: postponing is right while it costs no more than
deciding now, but code left holding two jobs reads as intended and gets copied. Keeping the contained job easy to see
for that reason, and the unexported class as the JavaScript form, are this plugin's.

Done looks like: each class and method passes the one-sentence test without an "and" and can be tested alone
with little setup (*99 Bottles of OOP*, which reads heavy test setup as a sign of tight coupling) and read alone (this
plugin's criterion), and its parts share one pace of change (the 2009 SOLID talk, which repeats its
questions at each green step until nothing is left to extract).

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
