# Judging a design

Used by every skill in this plugin: by `lz-oop` for a question about one piece of code, by `lz-review` for each
change in a change set, and by `lz-audit` for each hot spot in a package.

1. Judge the code by what it costs to change, not by how it looks or by a metric alone. Ask what change is likely,
   and what this design would make that change cost. Code that works and will not change can stay as it is, however
   it looks; polishing it costs time and buys nothing (the talk Go Ahead, Make a Mess, hafentalks 2017).
2. Name each smell you see in the vocabulary of named smells and refactorings, and pair it with its usual cure
   (Ch.3; the talk Get a Whiff of This, 2016). Rank them; the easiest well-understood one goes first (Ch.3).
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
   - tests that are hard to write, or that mock too much: [testing-messages.md](testing-messages.md).
5. Keep each finding concrete: the file and lines, the smell's name, what change it makes expensive, the cure, and
   the first small step toward it.
