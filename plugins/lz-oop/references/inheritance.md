# Inheritance

Use when someone asks whether a class hierarchy should become composition, or whether to add a
subclass.

## Inheritance is allowed

Preferring composition is not a ban on inheritance (*99 Bottles of OOP*). Judge a hierarchy by its properties, not
by the keyword `extends`. Sandi Metz says she often starts with a subclass and refactors away from it
when it stops paying (the 2014 POODR Q&A).

- **Wait for examples.** Build a parent only once enough concrete subclasses exist to show what is
  shared; she has said to wait for the third (Fireside Chat, 2015; the transcript is unclear there,
  so treat it as a rule of thumb).
- **Liskov Substitution.** Any subclass must work wherever its parent is expected, with no sender
  checking which one it got. A sender that tests the class of what it holds is the usual sign that
  this broke (the talk SOLID, 2009). The book applies the same promise to every role player, not only
  to subclasses: answer the message, and return one kind of thing the sender can trust (see
  [dependencies-and-messages.md](dependencies-and-messages.md)).

## When a hierarchy is safe to keep

Check these against the code and cite the ones that hold. From the talk All the Little Things, 2014:

- **Shallow**: one level, or very few.
- **Narrow**: few subclasses.
- **Nothing refused**: every subclass uses all of what it inherits. A subclass that overrides an
  inherited method to throw has refused part of its parent, the smell Refused Bequest (Get a Whiff
  of This, 2016). This plugin reads an override that does nothing the same way.
- **At the edges**: picture the application's objects as a web of who talks to whom. The subclasses
  should sit at its outer edge, as objects that answer messages from their own data and talk to
  nothing else. The talks POODR with the Toronto Ruby Brigade, 2013, and the 2014 POODR Q&A give
  the reason: objects at the edge change least, so a hierarchy there is cheap to keep and cheap to
  undo, while a hierarchy around a core domain object tends to go badly. Why it goes badly is this
  plugin's inference: such an object is used by many others and uses many in turn, so a change to the
  parent reaches all of them.

From Nothing is Something, 2015:

- **Specialisation**: each subclass is a more specific kind of its parent, not a way to reuse the
  parent's code.

From All the Little Things, 2014, and the talk Defining OOD:

- **The parent plays the role too**: it answers every message its subclasses must answer. For a step
  every subclass must supply, the parent's version throws, so a subclass that forgot it fails
  loudly; for an optional step, it returns a harmless default, so a subclass with nothing to add
  writes nothing.
- **Hooks instead of `super`**: the parent calls small hook methods that subclasses override, rather
  than subclasses overriding a whole method and calling `super`. A subclass that has to remember to
  call `super` is a sign the hierarchy is drifting; one level with hooks avoids it (the 2014 POODR
  Q&A).
- **Test the contract**: one test that the parent throws for each required step, and a shared test
  that every subclass answers it (Defining OOD; the talk says little more). The shared test is set
  up as in Role tests in [javascript-and-typescript.md](javascript-and-typescript.md).

This plugin adds, as its own guidance:

- **Template Method**: a hierarchy that meets these conditions is usually a Template Method. Go
  Ahead, Make a Mess, 2012, says inheritance of that kind suits variants that are nearly alike; the
  link between that and the conditions above is this plugin's inference.
- **In TypeScript**: hooks are public or `protected` methods, and a required step can be `abstract`
  instead of throwing. See Hooks and required steps in TypeScript in
  [javascript-and-typescript.md](javascript-and-typescript.md).

When the conditions hold, recommend keeping the hierarchy and say which properties support that.

## When to move toward composition

- **Variants that have to combine.** Two subclasses each work alone, but a case needs both: with
  inheritance that means a third subclass for the mix, and the count grows with every combination.
  Pull the part that varies out into its own object, name its role, and pass the right one in
  (Nothing is Something, 2015).
- **Inheritance used to share code** rather than to specialise a concept (Nothing is Something,
  2015). The talk argues this about subclassing, and separately counts Ruby modules as a form of
  inheritance. This plugin extends that to JavaScript mixins copied onto a prototype, which follow
  the same rules. The talk cautions rather than forbids, and the worry is sharpest when the
  specialised part is small beside the class it extends. It does not condemn a subclass that is a
  real specialisation: All the Little Things, 2014, moves code the subclasses had duplicated up into
  a parent and calls that sound when the hierarchy is shallow, narrow, at the edges, and every
  subclass uses all it inherits. Katrina Owen's Succession, 2016, does the same on a smaller scale:
  one variant inherits from the other to avoid duplicating what they share and replaces a single
  step, which she accepts as more structure bought for flexibility. Reading such a subclass as one
  that reuses its parent through hook methods is this plugin's; neither talk uses that word.
- **A subclass that refuses part of its parent**, or a tree that has grown deep or wide.
- **A subclass that overrides only a sliver of its parent**, or one whose name claims an is-a
  relation the behaviour does not support (Nothing is Something, 2015).

Replacing a conditional with subclasses and replacing it with composed objects (Strategy or State)
are both valid cures; when the choice is close, try both and keep the clearer one (*99 Bottles of OOP*).

## From a conditional to subclasses

Use when one class keeps testing the same value in several methods and the cure chosen is subclasses.
The steps follow *99 Bottles of OOP*; the wording is this plugin's.

1. Make an empty subclass for one special value the conditionals test. With no reason to prefer one,
   start with the first. The parent keeps the default case.
2. Pick any one method that tests that value. Copy it whole into the subclass (copy, do not move) and
   cut the copy down to the special branch.
3. If there is no factory yet, add one: first as a plain indirection that still returns the parent,
   with every caller switched to it, then let it choose the new subclass for its value. Register each
   later subclass there too.
4. Cut the parent's version down to the default branch. Without step 3 this edit is the one that turns
   the tests red, which is why the factory has to exist by now; the book's walkthrough lets that red
   happen once, for a later value, before it adds the subclass to the factory.
5. Repeat for every method that tests the value, then for each further special value.

Done when no method in the parent or the subclasses tests the value, each value has its subclass, and
the factory is the only place that knows the concrete classes and chooses among them. Its own
conditional stays (the book).

**A hierarchy from one concrete class.** Sandi Metz's public example code for *Practical
Object-Oriented Design* builds a parent the other way: it moves all the concrete class's code down
into a new subclass, leaving the parent empty, then promotes into the parent one piece at a time
only what the subclasses share, until the defaults and hooks live there. The code labels the steps
without giving reasons; the reading that this keeps the parent from holding anything a subclass
would refuse is this plugin's.

## Composing the parts

The steps, from Nothing is Something, 2015: find what varies, give it a name, decide the messages
of that role, and inject an object that plays it. She calls composition with injection the centre
of object design: less code, and every combination of players available. *99 Bottles of OOP*, where it
moves a varying part out of a class, follows the same steps on its own example: it extracts the part into a new
class, names the role that class plays, injects an instance back, and has the receiving class
forward messages to it. Each new variant then plugs in at that injection point.

- **A player for nothing.** The case where nothing should happen gets its own player as well, so
  the composed object never checks for absence (Nothing is Something, 2015; Polly Want a Message,
  2018).
- **The composed object coordinates.** It sends messages to its players and holds no per-variant
  logic of its own (Polly Want a Message, 2018).
- **Choose early.** Pick each player at the earliest point in the program that knows enough to
  pick it, and pass it down from there (Polly Want a Message, 2018).
- **Parts from configuration.** Her public example code for POODR's composition chapter builds the
  parts with a factory that reads a configuration, so a new kind needs new configuration and no new
  class. The code shows this without prose rules; the plugin's reading is that it suits kinds that
  differ only in which parts they hold.

## Mixins

JavaScript mixins (a function that returns a subclass, or methods copied onto a prototype) play the
part Ruby modules play in her talks. Method lookup through them works as it does for a parent, so
every rule above applies to them, Liskov Substitution included (POODR with the Toronto Ruby Brigade,
2013). The JavaScript mapping is this plugin's.

- **When one fits**: a behaviour that unrelated classes share, which each object has without being
  that thing, such as persistence, printing or logging (same talk). The host there framed it
  as is-a for a subclass, has-a for composition and behaves-like for a mixin, and she agreed.
- **When one does not**: a mixin used by a single class only moves code out of sight (the 2014
  POODR Q&A; the talk Rules, 2013).
- **Look at composition first**: wanting a mixin is a prompt to ask whether an injected
  collaborator would do the job (The Bike Shed, 2016). For the TypeScript cost of mixins, see
  Inheritance, mixins and built-in types in
  [javascript-and-typescript.md](javascript-and-typescript.md).
