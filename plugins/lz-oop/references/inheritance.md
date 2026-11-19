# Inheritance

Use when someone asks whether a class hierarchy should become composition, whether to add a subclass, or which
relationship (a subclass, a role, or composed parts) fits a new kind.

Contents: Inheritance is allowed; Choosing the relationship; When a hierarchy is safe to keep; When to move toward
composition; From a conditional to subclasses; A new hierarchy of peers; Composing the parts; From subclasses to
composed objects; Mixins.

## Inheritance is allowed

Preferring composition is not a ban on inheritance. Judge a hierarchy by its properties, not by the keyword `extends`.
Starting with a subclass and refactoring away from it when it stops paying is a sound route (Sandi Metz).

- **Wait for a clear abstraction.** There is no fixed count: generalise once the examples make the shared shape plain,
  and keep the duplication while they leave it murky. A hierarchy starts from a change request and a smell, and its
  first subclass may stand for a single special value. One case has a number, a new parent over peers (see A new
  hierarchy of peers, below): three subclasses are the safe point, two can be defended, and one is nearly always too
  early. Weigh how soon the next kind will arrive against what the copies cost until then.
- **Liskov Substitution.** Any subclass must work wherever its parent is expected, with no sender checking which one it
  got. A sender that tests the class of what it holds is the usual sign that this broke. The same promise holds for
  every role player, not only for subclasses: answer the message, and return one kind of thing the sender can trust (see
  [dependencies-and-messages.md](dependencies-and-messages.md)). For an override's types: it may accept more than the
  parent's version and may return something narrower, never the reverse. In TypeScript an override whose result can be
  something the parent's cannot is an error. The input half is caught only in part: a method override with a narrower
  parameter type compiles, because method parameters are checked bivariantly. An added required parameter is always an
  error, and a narrower parameter on a hook typed as a function-valued property is one under `strict` (measured with
  TypeScript 6.0.3). Catch a narrowed method parameter in review or in the shared role test.

## Choosing the relationship

Three relationships, each with its own fit:

- **Is-a, a subclass**: a small, settled set of kinds, each a more specific version of one stable idea. A new kind is
  then one new subclass and no edit elsewhere, and subclasses receive the parent's behaviour without writing any
  forwarding.
- **Behaves-like-a, a role**: a behaviour that many unrelated objects need beside their main job. Each object plays the
  role with its own methods; shared code comes in only where the players would otherwise copy it (see Mixins, below).
- **Has-a, composition**: a whole built from parts that can vary independently. Each part plays a role, and the whole
  talks to its parts only through that role's messages.

What each costs:

- A hierarchy concentrates risk. An edit to the parent reaches every subclass, kinds that have to mix cannot be
  expressed, and whoever extends a poor tree later tends to copy code or check classes rather than fix the tree. Who
  will extend the code matters too: a class that others can use only by subclassing it ties their code to its internals.
- Composition keeps the parts independent and makes every combination available, but the whole is harder to see at a
  glance, forwarding to the parts is written by hand, and kinds that differ in one small detail are served worse than by
  a subclass each.

Choose the relationship that suits the change at hand, with no default between them, and when you cannot tell, try both
cures and keep the clearer one (When to move toward composition, below). Inheritance fits best with a fixed and obvious
family, kept shallow and narrow; many variants of one stable idea; code inside your own application, in a domain you
know well. Treat these conditions as questions to ask, not as a verdict.

## When a hierarchy is safe to keep

Check these against the code and cite the ones that hold.

- **Shallow**: one level, or very few.
- **Narrow**: few subclasses.
- **Nothing refused**: every subclass uses all of what it inherits. A subclass that overrides an inherited method to
  throw has refused part of its parent, the smell Refused Bequest. An override that does nothing because doing nothing
  is a valid form of the varying behaviour is not this smell, though moving that behaviour into an injected role with a
  do-nothing player is worth weighing. One that cancels an effect the parent promises is the same smell as throwing.
- **At the edges**: picture the application's objects as a web of who talks to whom. The subclasses should sit at its
  outer edge, as objects that answer messages from their own data and talk to nothing else. The reason is uncertainty:
  the core is the part least understood and most likely to change, so a hierarchy around a core domain object tends to
  go badly, while the edge changes little and a wrong hierarchy there is cheap to keep and cheap to undo.
- **Specialisation**: each subclass is a more specific kind of its parent, not a way to reuse the parent's code.
- **The parent plays the role too**: it answers every message its subclasses must answer. For a step every subclass must
  supply, the parent's version throws, so a subclass that forgot it fails loudly; for an optional step, it returns a
  harmless default, so a subclass with nothing to add writes nothing. The thrown error names the subclass that left the
  step out (in JavaScript, `this.constructor.name`), so the failure is clear wherever it shows; and an optional step's
  default may also be a real value that every kind shares and one kind overrides. A subclass whose steps have all come
  to match the parent's defaults has nothing left to say: delete it, and have the factory map its key to the parent.
- **Hooks instead of `super`**: the parent calls small hook methods that subclasses override, rather than subclasses
  overriding a whole method and calling `super`. A subclass that has to remember to call `super` is a sign the hierarchy
  is drifting; one level with hooks avoids it.
- **Test the contract**: one test that the parent throws for each required step, and a shared test that every subclass
  answers it. The shared test is set up as in Role tests in
  [javascript-and-typescript.md](javascript-and-typescript.md).
- **Template Method**: call a kept hierarchy a Template Method only when a public method of the parent fixes the order
  of the steps and calls the ones subclasses supply; say which steps every subclass must supply and which are optional
  hooks with a harmless default, and keep the required ones few. A hierarchy meeting these conditions is usually one,
  and inheritance of that kind suits variants that are nearly alike. The pattern also prefers a hook the parent calls
  over an override that must call the parent's version.
- **In TypeScript**: hooks are public methods by default, `protected` only where no test sends them, and a required step
  can be `abstract` instead of throwing. See Hooks and required steps in TypeScript in
  [javascript-and-typescript.md](javascript-and-typescript.md).

When the conditions hold, recommend keeping the hierarchy and say which properties support that.

## When to move toward composition

- **Variants that have to combine.** Two subclasses each work alone, but a case needs both: with inheritance that means
  a third subclass for the mix, and the count grows with every combination. Pull the part that varies out into its own
  object, name its role, and pass the right one in.
- **Inheritance used to share code** rather than to specialise a concept. JavaScript mixins copied onto a prototype
  count as inheritance here and follow the same rules. This is a caution, not a ban, and it is sharpest when the
  specialised part is small beside the class it extends. It does not condemn a subclass that is a real specialisation:
  moving code the subclasses had duplicated up into a parent is sound when the hierarchy is shallow, narrow, at the
  edges, and every subclass uses all it inherits. On a smaller scale, one variant may inherit from a working concrete
  class that holds the shared behaviour and the default step, override the one step that the parent's public method
  calls (a hook), and add what that step alone needs, to avoid duplication, accepting more structure bought for
  flexibility.
- **A subclass that refuses part of its parent**, or a tree that has grown deep or wide.
- **A subclass that overrides only a sliver of its parent**, or one whose name claims an is-a relation the behaviour
  does not support.

Replacing a conditional with subclasses and replacing it with composed objects (Strategy or State) are both valid cures;
when the choice is close, try both and keep the clearer one. To turn an existing hierarchy into composed parts, see From
subclasses to composed objects, below.

## From a conditional to subclasses

Use when one class keeps testing the same value in several methods and the cure chosen is subclasses. Run the tests
after every step, and undo a step that turns them red.

1. Make an empty subclass for one special value the conditionals test. With no reason to prefer one, start with the
   first. The parent keeps the default case.
2. Pick any one method that tests that value. Copy it whole into the subclass (copy, do not move) and cut the copy down
   to the special branch.
3. If there is no factory yet, add one: first as a plain indirection that still returns the parent, with every caller
   switched to it, then let it choose the new subclass for its value. Register each later subclass there too.
4. Cut the parent's version down to the default branch. Without step 3 this edit is the one that turns the tests red,
   which is why the factory has to exist by now.
5. Repeat for every method that tests the value, then for each further special value.

Done when no method in the parent or the subclasses tests the value, each value has its subclass, and the factory is the
only place that knows the concrete classes and chooses among them. Its own conditional stays.

## A new hierarchy of peers

Use when a working class gets a second kind and neither kind is the ordinary case that the other overrides. To tell
which case you have, list the existing class's public members (for a class with one public method, the private steps it
calls) and mark each one: holds for the new kind as written, must be replaced, or means nothing for the new kind. When
more hold as written than not, the existing class is the general rule and the new kind an exception to some of it: keep
the existing class as the concrete parent with its general rules, and let the new subclass override each member that is
wrong for it, each override pinned by a test, as From a conditional to subclasses does when one kind is the default. An
override may differ in what it does, not only in a value: special kinds may replace whole methods. Make a private step
the subclass must override a hook first: public, or `protected` where no test sends it. When half or fewer hold as
written, the kinds are peers, and the steps below apply.

For peers, do not put the new kind straight under the working class. That class was written for one kind, so the new
subclass inherits behaviour that is true of the first kind only, and senders soon have to check which kind they hold.

1. Add a subclass named for the existing kind, and move all of the class's code down into it, leaving the parent empty.
   Point every place that creates the class at the subclass (with a factory, that is one edit). Run the tests.
2. Add the new kind as a second, empty subclass, and drive its behaviour with tests.
3. Lift into the parent, one method at a time, only what both kinds need, with a green test run between lifts. Split a
   method that mixes shared work with work for one kind before you lift it: the kind-specific part becomes a hook (Hooks
   instead of `super`, above), and the shared part goes up. Go straight to hooks rather than subclasses that call up to
   the parent: calling up makes every subclass know the parent's algorithm and repeat the call, and a subclass that
   forgets the call silently gets empty values.
4. Where the shared code needs a value or a step that differs by kind, have the parent ask for it through a hook. Write
   each hook as the bullet The parent plays the role too, above, says: a required hook throws in the parent (or is
   `abstract` in TypeScript), and an optional one returns a default.

Done when the parent holds only what every subclass uses, nothing creates the parent itself, and no subclass refuses
anything it inherits.

The reason for moving everything down first: a method left in a subclass that should have gone up shows as duplication
and costs little to fix later, while a method left in the parent that fits only one kind is wrong for the others, and
the harm spreads to the code that uses the hierarchy, which starts checking which kind it holds. Under either recipe, a
parent holds nothing true of only one kind beyond the general rules that the special kinds override.

## Composing the parts

The steps: find what varies, give it a name, decide the messages of that role, and inject an object that plays it.
Composition with injection is the centre of object-oriented design: less code, and every combination of players
available (Sandi Metz). When you move a varying part out of a class, extract the part into a new class, name the role
that class plays, inject an instance back, and have the receiving class forward messages to it. Each new variant then
plugs in at that injection point.

- **A player for nothing.** The case where nothing should happen gets its own player as well, so the composed object
  never checks for absence.
- **The composed object coordinates.** It sends messages to its players and holds no per-variant logic of its own.
- **Choose early.** Pick each player at the earliest point in the program that knows enough to pick it, and pass it down
  from there.
- **Parts from configuration.** For kinds that differ only in which parts they hold, describe each valid combination as
  short data and build the parts with a factory that reads it, so a new kind needs new configuration and no new class.
  Two rules keep it safe: no code but the factory reads how the data is laid out, and nothing builds those objects
  except through the factory. Give the factory the classes it builds as parameters, at least the collection class, so a
  test or a new use can pass other classes.

## From subclasses to composed objects

Use when an existing hierarchy has to give way to composition and its subclasses differ mainly in what they are made of:
which components, settings or values they hold. Run the tests after every step.

1. Decide what the whole is made of. Keep in it only what is truly its own, and have it forward everything that varies
   to one new object that holds the components.
2. Move the hierarchy into that holder nearly unchanged: the holder's own subclasses now carry the kinds, and the tests
   stay green while nothing is redesigned yet. This step shows how little of the code belonged to the whole.
3. Give a single component a small class of its own, so the holder keeps a list of components and asks them, instead of
   computing per kind. The holder's subclasses go away here; for now, the code that creates a whole assembles each
   kind's components by hand.
4. Let the holder answer the few list messages its callers use (see Inheritance, mixins and built-in types in
   [javascript-and-typescript.md](javascript-and-typescript.md)).
5. The hand assembly spreads knowledge of every kind to the callers. Describe each kind as configuration instead, build
   each kind's holder of components through one factory that reads it, and pass that holder to the whole (Parts from
   configuration, above).
6. Move each default value the components still carry for themselves into the factory, which fills it in when a
   configuration entry leaves it out; the factory is then its one home. A component left with no behaviour can become a
   plain value.

Done when no subclass remains, each former kind is a few lines of configuration, and the whole only coordinates its
components.

## Mixins

JavaScript mixins (a subclass factory, or methods copied onto a prototype) are a form of inheritance. A subclass factory
puts the mixin in the prototype chain, so lookup works as it does for a parent; copied methods become the host's own
methods, fixed when copied, so a later change to the mixin object does not reach the host. Either way the host takes on
the mixin's messages, so every rule above applies to them, Liskov Substitution included.

- **When one fits**: a behaviour that unrelated classes share, which each object has without being that thing, such as
  persistence, printing or logging.
- **When one does not**: a mixin used by a single class only moves code out of sight.
- **Look at composition first**: wanting a mixin is a prompt to ask whether an injected collaborator would do the job.
  For the TypeScript cost of mixins, see Inheritance, mixins and built-in types in
  [javascript-and-typescript.md](javascript-and-typescript.md).
- **Writing one**, when a mixin is still the choice. Code that the players of a role share follows the rules of a parent
  class:
  - Declare every message the mixin sends to its host. The mixin supplies a default for each: one that throws for a
    message every host must answer, a harmless value for an optional one.
  - Let each host supply its own values by answering those messages, so the mixin reads no host field.
  - Pass in any collaborator the mixin needs rather than creating it there; see the paragraph on state below.

  Those defaults work when the mixin is a subclass factory (`(Base) => class extends Base`), so the host's own method
  overrides the mixin's, or when the copy skips every member the host already defines. A plain `Object.assign` onto a
  prototype overwrites the host's method with the default, and a throwing default then throws on every call; it also
  copies nothing from a mixin written as a class, whose methods are not enumerable.

  A mixin may keep state of its own and give its collaborator a default when that state belongs to the role in every
  host, such as an injectable collaborator with a default created on first use. Prefer stateless mixins, handed their
  collaborators; that costs passing the collaborator in at each host (Inheritance, mixins and built-in types in
  [javascript-and-typescript.md](javascript-and-typescript.md); Injecting collaborators in
  [dependencies-and-messages.md](dependencies-and-messages.md)).
