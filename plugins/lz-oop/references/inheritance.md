# Inheritance

Use when someone asks whether a class hierarchy should become composition, whether to add a
subclass, or which relationship (a subclass, a role, or composed parts) fits a new kind.

Contents: Inheritance is allowed; Choosing the relationship; When a hierarchy is safe to keep; When to move toward
composition; From a conditional to subclasses; A new hierarchy of peers; Composing the parts; From subclasses to
composed objects; Mixins.

## Inheritance is allowed

Preferring composition is not a ban on inheritance (*99 Bottles of OOP*). Judge a hierarchy by its properties, not
by the keyword `extends`. Sandi Metz says she often starts with a subclass and refactors away from it
when it stops paying (the 2014 POODR Q&A).

- **Wait for a clear abstraction.** *99 Bottles of OOP* sets no count: generalise once the examples make the shared
  shape plain, and keep the duplication while they leave it murky. A hierarchy there starts from a change request
  and a smell, and its first subclass may stand for a single special value. *Practical Object-Oriented Design* adds
  a number for one case only, a new parent over peers (see A new hierarchy of peers, below): three subclasses are
  the safe point, two can be defended, and one is nearly always too early. Weigh how soon the next kind will arrive
  against what the copies cost until then. She has also said in a talk to wait for the third (Fireside Chat, 2015;
  the transcript is unclear there).
- **Liskov Substitution.** Any subclass must work wherever its parent is expected, with no sender
  checking which one it got. A sender that tests the class of what it holds is the usual sign that
  this broke (the talk SOLID, 2009). *99 Bottles of OOP* applies the same promise to every role player, not only
  to subclasses: answer the message, and return one kind of thing the sender can trust (see
  [dependencies-and-messages.md](dependencies-and-messages.md)). *Practical Object-Oriented Design* states the rule
  for an override's types: it may accept more than the parent's version and may return something narrower, never
  the reverse. In TypeScript an override whose result can be something the parent's cannot is an error. The input
  half is caught only in part: a method override with a narrower parameter type compiles, because method
  parameters are checked bivariantly. An added required parameter is always an error, and a narrower parameter on a
  hook typed as a function-valued property is one under `strict` (measured with TypeScript 6.0.3; this plugin's
  note). Catch
  a narrowed method parameter in review or in the shared role test.

## Choosing the relationship

*Practical Object-Oriented Design* names three relationships, each with its own fit:

- **Is-a, a subclass**: a small, settled set of kinds, each a more specific version of one stable idea. A new kind
  is then one new subclass and no edit elsewhere, and subclasses receive the parent's behaviour without writing any
  forwarding.
- **Behaves-like-a, a role**: a behaviour that many unrelated objects need beside their main job. Each object plays
  the role with its own methods; shared code comes in only where the players would otherwise copy it (see Mixins,
  below).
- **Has-a, composition**: a whole built from parts that can vary independently. Each part plays a role, and the
  whole talks to its parts only through that role's messages.

*Practical Object-Oriented Design* also weighs what each costs:

- A hierarchy concentrates risk. An edit to the parent reaches every subclass, kinds that have to mix cannot be
  expressed, and whoever extends a poor tree later tends to copy code or check classes rather than fix the tree.
  Who will extend the code matters too: a class that others can use only by subclassing it ties their code to its
  internals.
- Composition keeps the parts independent and makes every combination available, but the whole is harder to see at
  a glance, forwarding to the parts is written by hand, and kinds that differ in one small detail are served worse
  than by a subclass each.

Choose the relationship that suits the change at hand, with no default between them, and when you cannot tell, try
both cures and keep the clearer one (When to move toward composition, below). *Practical Object-Oriented Design*
makes composition its default and asks inheritance to prove its fit: a fixed and obvious family, kept shallow and
narrow; many variants of one stable idea; code inside your own application, in a domain you know well. This plugin
follows *99 Bottles of OOP* instead. Treat the conditions above as questions to ask, not as a
verdict.

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

- **Template Method**: *Practical Object-Oriented Design* names the technique and builds its hierarchies with it.
  That a hierarchy meeting these conditions is usually one is this plugin's inference, as is the link to Go Ahead,
  Make a Mess, 2012, which says inheritance of that kind suits variants that are nearly alike.
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
are both valid cures; when the choice is close, try both and keep the clearer one (*99 Bottles of OOP*). To turn
an existing hierarchy into composed parts, see From subclasses to composed objects, below.

## From a conditional to subclasses

Use when one class keeps testing the same value in several methods and the cure chosen is subclasses.
The steps follow *99 Bottles of OOP*; the wording is this plugin's. Run the tests after every step, and undo a step
that turns them red.

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

## A new hierarchy of peers

Use when a working class gets a second kind and neither kind is the ordinary case that the other overrides. To tell
which case you have, ask of each public member of the existing class whether it holds for the new kind as written,
or with only a different value. When every member does, the new kind only specialises the old: keep the existing
class as the concrete parent with its defaults, and let the new subclass override each member whose value is
wrong for it, each override pinned by a test, as From a conditional to subclasses does when one kind is the default
(*99 Bottles of OOP*). When a member is wrong for the new kind in what it does, or means nothing for it, the kinds
are peers, and the steps below apply (this plugin's reading).

For peers, do not put the new kind straight under the working class. That class was written for one kind, so the
new subclass inherits behaviour that is true of the first kind only, and senders soon have to check which kind they
hold. *Practical Object-Oriented Design* treats subclassing a working concrete class this way as a mistake and makes
no exception for special cases; the special-case route above departs from it and follows *99 Bottles of OOP*, as
this plugin does where the two books differ. The steps follow *Practical Object-Oriented Design* and Sandi Metz's
public example-code repositories for it, poodr and poodr2; the numbering and the test runs are this plugin's.

1. Add a subclass named for the existing kind, and move all of the class's code down into it, leaving the parent
   empty. Point every place that creates the class at the subclass (with a factory, that is one edit). Run the
   tests.
2. Add the new kind as a second, empty subclass, and drive its behaviour with tests.
3. Lift into the parent, one method at a time, only what both kinds need, with a green test run between lifts.
   Split a method that mixes shared work with work for one kind before you lift it: the kind-specific part becomes
   a hook (Hooks instead of `super`, above), and the shared part goes up.
4. Where the shared code needs a value or a step that differs by kind, have the parent ask for it through a hook.
   A hook every subclass must supply throws in the parent, or is `abstract`; an optional one returns a harmless
   default.

Done when the parent holds only what every subclass uses, nothing creates the parent itself, and no subclass
refuses anything it inherits.

*Practical Object-Oriented Design*'s reason for moving everything down first: a method left in a subclass that should
have gone up shows as duplication and costs little to fix later, while a method left in the parent that fits only one
kind is wrong for the others, and the harm spreads to the code that uses the hierarchy, which starts checking which kind
it holds.
Under either recipe, a parent holds nothing true of only one kind beyond the default that the special kinds override
(this plugin's reconciliation of the two books).

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
- **Parts from configuration.** For kinds that differ only in which parts they hold, *Practical
  Object-Oriented Design* describes each valid combination as short data and builds the parts with a
  factory that reads it, so a new kind needs new configuration and no new class (her public example
  code shows the same). Two rules from *Practical Object-Oriented Design* keep it safe: no code but the
  factory reads how the data is laid out, and nothing builds those objects except through the factory.

## From subclasses to composed objects

Use when an existing hierarchy has to give way to composition and its subclasses differ mainly in what they are
made of: which components, settings or values they hold. The order follows the way *Practical Object-Oriented
Design* rebuilds one of its own hierarchies; the general wording, the test runs and the Done line are this plugin's.
Run the tests after every step.

1. Decide what the whole is made of. Keep in it only what is truly its own, and have it forward everything that
   varies to one new object that holds the components.
2. Move the hierarchy into that holder nearly unchanged: the holder's own subclasses now carry the kinds, and the
   tests stay green while nothing is redesigned yet. *Practical Object-Oriented Design* points out what this step
   shows: how little of the code belonged to the whole.
3. Give a single component a small class of its own, so the holder keeps a list of components and asks them,
   instead of computing per kind. The holder's subclasses go away here; for now, the code that creates a whole
   assembles each kind's components by hand.
4. Let the holder answer the few list messages its callers use (see Inheritance, mixins and built-in types in
   [javascript-and-typescript.md](javascript-and-typescript.md)).
5. The hand assembly spreads knowledge of every kind to the callers. Describe each kind as configuration instead,
   build each kind's holder of components through one factory that reads it, and pass that holder to the whole
   (Parts from configuration, above).
6. Delete the default values the components still carry for themselves, now that the configuration supplies them.
   A component left with no behaviour can become a plain value.

Done when no subclass remains, each former kind is a few lines of configuration, and the whole only coordinates its
components.

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
- **Writing one**, when a mixin is still the choice. *Practical Object-Oriented Design* puts code that
  the players of a role share in a module and gives it the rules of a parent class. Restated for a
  mixin:
  - Declare every message the mixin sends to its host. The mixin supplies a default for each: one that
    throws for a message every host must answer, a harmless value for an optional one.
  - Let each host supply its own values by answering those messages, so the mixin reads no host field.
  - Pass in any collaborator the mixin needs rather than creating it there. This rule is this plugin's,
    not *Practical Object-Oriented Design*'s; see the paragraph on
    *Practical Object-Oriented Design*'s role module below.

  Those defaults work only when the mixin is a function that returns a subclass, so the host's own
  method overrides the mixin's. Copying methods onto a prototype (`Object.assign`) overwrites the
  host's method with the default, and a throwing default then throws on every call (this plugin's
  note).

  *Practical Object-Oriented Design*'s role module keeps state of its own and gives its collaborator a
  default. This plugin keeps mixins stateless (Inheritance, mixins and built-in types in
  [javascript-and-typescript.md](javascript-and-typescript.md)) and drops a default that ties the code
  to its first setting (Injecting collaborators in
  [dependencies-and-messages.md](dependencies-and-messages.md)); a role whose shared code needs state
  is better served by an injected object.
