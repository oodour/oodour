# Inheritance

Use when someone asks whether a class hierarchy should become composition, or whether to add a
subclass.

## Inheritance is allowed

Preferring composition is not a ban on inheritance (Ch.6). Judge a hierarchy by its properties, not
by the keyword `extends`.

## When a hierarchy is safe to keep

Check these against the code and cite the ones that hold. From the talk All the Little Things, 2014:

- **Shallow**: one level, or very few.
- **Narrow**: few subclasses.
- **Nothing refused**: every subclass uses all of what it inherits. A subclass that overrides a
  method to do nothing, or to throw, has refused part of its parent (the smell Refused Bequest).
- **At the edges**: picture the application's objects as a web of who talks to whom. The subclasses
  should sit at its outer edge, as objects that answer messages from their own data and talk to
  nothing else. The talks POODR with the Toronto Ruby Brigade, 2013, and the 2014 POODR Q&A give
  the reason: objects at the edge change least, so a hierarchy there is cheap to keep and cheap to
  undo, while a hierarchy around a core domain object tends to go badly. Why it goes badly is this
  skill's inference: such an object is used by many others and uses many in turn, so a change to the
  parent reaches all of them.

From Nothing is Something, 2015:

- **Specialisation**: each subclass is a more specific kind of its parent, not a way to reuse the
  parent's code.

This skill adds, as its own guidance:

- **A harmless default for optional steps**: where a subclass may add behaviour, the parent supplies
  a default that does nothing, so a subclass with nothing to add writes nothing. (All the Little
  Things, 2014, uses such a default in one example and says raising an error is also an option.)
- **Template Method**: a hierarchy that meets these conditions is usually a Template Method. Go
  Ahead, Make a Mess, 2012, says inheritance of that kind suits variants that are nearly alike; the
  link between that and the conditions above is this skill's inference.

When the conditions hold, recommend keeping the hierarchy and say which properties support that.

## When to move toward composition

- **Variants that have to combine.** Two subclasses each work alone, but a case needs both: with
  inheritance that means a third subclass for the mix, and the count grows with every combination.
  Pull the part that varies out into its own object, name its role, and pass the right one in
  (Nothing is Something, 2015).
- **Inheritance used to share code** rather than to specialise a concept (Nothing is Something,
  2015). The talk argues this about subclassing, and separately counts Ruby modules as a form of
  inheritance. This skill extends that to JavaScript mixins copied onto a prototype, which follow
  the same rules.
- **A subclass that refuses part of its parent**, or a tree that has grown deep or wide.

Replacing a conditional with subclasses and replacing it with composed objects (Strategy or State)
are both valid cures; when the choice is close, try both and keep the clearer one (Ch.6).
