# Dependencies and messages

Use when a class creates or looks up its own collaborators, when a method reaches through one object to another, when a
sender walks a receiver through steps, or when a test needs a lot of setup to build the object under test.

Contents: Message first; A public interface on purpose; Reaching through other objects (the Law of Demeter); Injecting
collaborators; Which way a dependency points; Interfaces you do not own; What a receiver owes its senders.

A class depends on another when a change to the other can force a change to it. What one class can know about another,
each one a dependency to keep to what the task needs:

- its class name (Injecting collaborators, below);
- the name of a message it sends there (Interfaces you do not own, step 2);
- the arguments that message takes, and their order (Parameter lists and options objects in
  [javascript-and-typescript.md](javascript-and-typescript.md)).

A chain of calls through other objects (Reaching through other objects, below) and a test that knows too much about how
the code works ([testing-messages.md](testing-messages.md)) are dependencies too.

## Message first

Decide first what message the sender wants to send, then find or invent the object that should answer it (Sandi Metz;
coding by wishful thinking). A sender that walks a receiver through the steps of a job knows how the job is done, and so
depends on it. Do not start from the obvious nouns of the domain: they come to mind first and collect behaviour that
does not belong to them, while the messages passing between them reveal the objects that are missing.

To find the objects and messages for a new use case, or when you cannot decide what to test first, sketch a sequence
diagram on a whiteboard: it shows the design at the level that matters and is cheap to change, since there is no code
yet to grow attached to. Draw it loosely, not as strict UML, and erase it afterwards. In the diagram, a sender that
gives a receiver a series of step-by-step instructions knows too much; after the fix it sends one message that names its
goal. Markers for what each sender knows, and how stable that knowledge is, can go in the diagram too. Keep the sketch
small before the first test: past that, let collaborators come out of the tests and of refactoring. A throwaway sketch
later on (pseudocode, or the call you wish you could make) is fine whenever the next step is unclear, provided you
discard it and the tests then drive the code.

How much a sender knows about its receiver runs in three stages:

1. **It dictates the steps**, sending each one in turn. It knows how the job is done, the receiver has to expose every
   step, and each new step changes the sender.
2. **It asks for the job** in one message. The receiver's public interface shrinks, but the sender still knows what the
   receiver does, and that it needs one.
3. **It says what it wants and trusts the receiver**, without checking how the goal is met. At this stage a sender can
   hold a list of collaborators and send each the same message; a new collaborator joins with no edit to the sender.

When you find a sender at the first stage, name what it knows about the receiver: the messages it sends, their arguments
and order, the order the steps must run in, and the shape of any data it reads back. For each, say that a change to it
in the receiver forces a change in the sender, which is what makes it a dependency.

When you move a sender up these stages, say how each side is then tested: the steps are tested on the receiver, through
its public message; the sender's own unit test gets a stand-in receiver and checks either that the one outgoing command
was sent, or what the sender returns or throws when the stand-in accepts or refuses. The message grid in
[testing-messages.md](testing-messages.md) has the rules.

An object's context is everything it expects of the objects around it, and every use of it, its tests included, has to
set that context up first; tightly coupled objects carry the most. One way to shrink a sender's context further than
injection does: pass `this` along with the message, and let the receiver ask back for what it needs. The receiver then
depends on the sender answering those few messages; in TypeScript, type that parameter as a small role with only those
messages, not as the sender's class.

When the receiver does not exist yet, code by wishful thinking:

1. Write the call the sender would like to make, commented out, since nothing answers it yet.
2. Build the receiver while nothing calls it. The suite stays green, but that shows only that the new code parses.
3. Turn the call on, run the tests, then delete the old path.

These steps are larger and riskier than the finer-grained recipes in [changing-in-steps.md](changing-in-steps.md),
because the new code is not proven until it is used. On red, undo, and go back to smaller steps or test-drive the new
class. The technique suits pulling out a class that needs light edits; one that needs heavy rework is better test-driven
from the start.

## A public interface on purpose

Use when deciding which methods of a class are public, or when a class exposes many small step methods.

Split a class's methods by who may lean on them. The public ones are an invitation to other objects, so they carry the
class's purpose, change rarely, and are pinned down by tests that double as their documentation. Everything else is
detail the class may rework whenever it likes; nothing outside should depend on it, and the tests can leave it alone, or
test it apart from the public ones so that readers of the tests do not come to depend on it. Keep private methods out of
the lasting tests: they are covered through the public ones, and a separate test of private logic is only a temporary
one, deleted the first time it fails (The message grid and Other guidance in
[testing-messages.md](testing-messages.md)).

For the public side, choose names that state the sender's goal rather than the receiver's procedure, names you expect to
keep, and named arguments (an options object; Parameter lists and options objects in
[javascript-and-typescript.md](javascript-and-typescript.md)). Make the split plain to see. In JavaScript and TypeScript
that means everything not public is `#private` or unexported (Private state in
[javascript-and-typescript.md](javascript-and-typescript.md)). When a sender moves from dictating steps to stating its
goal (Message first, above), the receiver's step methods lose their outside callers: make them private, except a method
a subclass overrides as a hook, which stays public (`protected` only where no test sends it; Hooks and required steps in
TypeScript, in [javascript-and-typescript.md](javascript-and-typescript.md)).

To decide what a class shows, hides or gives away, sort each thing it knows by two questions: is it this class's own
responsibility or another's, and is it steady or likely to change (Sandi Metz). Its own and steady: public. Its own and
changeable: private. Another's and steady: a dependency it may keep, and few of them. Another's and changeable: the
costly kind, which should leave the class, often for a factory; a switch on a type symbol usually holds several such
facts.

## Reaching through other objects (the Law of Demeter)

A method sends messages to itself, its arguments, and the objects it holds or creates, not to objects those return.

1. Do not judge by counting dots. Ask whether each step in the chain hands back an object with a different interface.
   Stepping through several unrelated objects is the problem. A chain whose steps keep one interface is no violation, so
   a pipeline whose steps each return the same kind of value (array methods, a builder, a fluent query) is none either.
2. Say what the chain costs: the sender breaks when any object along the way changes, it is hard to reuse elsewhere, its
   tests have to build the whole chain, and the intention behind it has no name.
3. Cure it by asking the nearest collaborator for what the sender actually wants, through a message named for that
   intention (Hide Delegate). Name it for the goal, not by gluing together the names in the chain.
4. Reports and other code whose job is to gather data from many places are a reasonable exception, and a rare one. The
   exception covers a chain that only reads, never one that changes the object at its end.

## Injecting collaborators

1. Treat creating an object as a message too: a class that creates its collaborators is coupled to their concrete
   classes.
2. Pass the collaborator in, and keep a lasting default for it only when the class itself can justify that player
   without reference to where the class came from; how many callers want it is not the test. A default parameter value
   keeps existing callers unchanged while you make the move; treat that default as a step in the refactoring and remove
   it later. The reason: a default chosen for the first caller ties the class to the place it came from, suggests that
   place still matters, and the class has no basis for choosing one, so once every test passes the collaborator
   explicitly, callers always supply it. Drop the default when it names something from the class's original setting, or
   exists only so the tests can run, and keep one the class can justify on its own, such as a system clock. A kept
   default goes in an options object when the constructor has several optional settings.
3. Name the parameter for the role the collaborator plays (a formatter, a clock, a gateway), not for the class that
   plays it today.
4. Where you can, pass in a ready instance rather than a class for the receiver to instantiate.
5. Move object creation outward, toward the code that starts the program, and keep concrete class names out of the
   methods that do the work. Of two possible dependencies, depend on the one less likely to change (below, Which way a
   dependency points); this also decides what a factory's candidates should depend on.
6. Put domain behaviour on instances, not on static methods or bare class-level functions. Static code bets that the
   concept will never hold varying data, and it is hard to refactor when that bet loses; creating an instance costs
   almost nothing, so create one every time. A static method that only builds an instance and delegates to it is fine.
7. Isolate what varies behind a role and inject it, so the code that stays the same does not change when a new variant
   arrives.

TypeScript: type the injected role as an interface or a type with only the messages the receiver sends, so any object
with those methods can play it, a test double included. The forms in code: Injecting collaborators in
[javascript-and-typescript.md](javascript-and-typescript.md).

## Which way a dependency points

Use when deciding which of two collaborators should know about the other, or when a class that many others use keeps
changing.

1. Every dependency has a direction, chosen on purpose or by accident; point it at the side less likely to change than
   the one that depends on it (Sandi Metz). Stability is relative: what matters is only that the thing depended on is
   steadier than its dependent.
2. Weigh three facts about the candidate: how often its requirements are likely to change, whether it is concrete or
   abstract (abstractions change less than the concrete classes they came from), and how many others depend on it (each
   change reaches every dependent).
3. Place it on a grid of likelihood of change against number of dependents. Steady with many dependents is usually an
   abstraction, and fine; changeable with few dependents is usually concrete code, and fine because little relies on it;
   steady with few dependents hardly matters. The costly corner is changeable with many dependents: each edit spreads to
   them all. Suspect a concrete class with many dependents of sitting there even when it looks stable.
4. Prefer depending on a message to depending on a class: a sender that knows only what it wants to ask, not which class
   answers, survives a change of class. Messages change less than classes.
5. When neither side is clearly steadier, do not guess a direction: cut what each side knows of the other to the least,
   with each side expecting a role rather than a class.
6. Spend loose coupling where it pays: the more central an object is, and the less sure anyone is of its requirements,
   the looser its ties should be. Where you are only a little unsure, a direct dependency can stay; where an object has
   proved steady, the indirection can come back out. A pair that keeps stalling, or a requirement nobody can state
   clearly, marks the code to keep easy to change.

Dependency Inversion is the name for the end state: neither the higher-level class nor its collaborator depends on the
other's concrete class; both depend on a role, favouring abstractions over concrete classes. Done: the receiver's
methods name no concrete player of an injected role, any class they still need is reached through a factory, and the
concrete choice is made where objects are assembled. Keeping concrete class names out of instance methods is a
guideline, not a law.

## Interfaces you do not own

Use when code calls a library, a framework or a collaborator whose interface may change and that you cannot change.

1. Wrap creation of a third-party object behind one method or module of your own, so only that place knows its
   constructor's shape, such as a fixed argument order; the rest of the code calls your wrapper with named options. An
   object made only to build others is a factory; application code should depend on what the application owns.
2. Wrap a risky outgoing message to a collaborator in a method of the sender's own, even before any duplication exists:
   if the collaborator renames the message or changes its arguments, one method changes. This is the exception to
   waiting for duplication; keep it for the messages most likely to change. A query that callers keep composing from a
   library's query builder is such a message: give the intention a name in one method on the object that owns the data,
   so only that method knows the library's query syntax.
3. When you cannot inject a collaborator yet, isolate its creation: build it in the constructor, or on first use in a
   dedicated method that builds it once. Either keeps creation out of the method that does the work and makes the
   dependency visible, though the class still knows its collaborator's class. The next step turns that creation into a
   constructor argument whose default is the new instance. TypeScript form: a `#field` set with `??=` in a private
   getter.
4. When only the receiver knows an argument needed to build its collaborator, so the caller cannot pass a ready
   instance, inject the class instead and send it one message that asks for the result the receiver wants, with creation
   hidden behind it. Creating an object is a message too, so creating one and then asking it for something is a chain of
   the kind the Law of Demeter flags. TypeScript form: inject a factory function that takes the receiver's data and
   returns the result the receiver needs, typed by that result. A factory typed to return an object the receiver then
   queries rebuilds the chain.
5. Use only a library's public, documented interface. Needing another class's private or internal member is a prompt to
   rethink the design. When a framework's internal member truly cannot be avoided, treat the use as debt that its next
   release may break, and reach for it from one wrapper only.

Done: one place in your code knows each foreign interface, and the receiver's working methods name no class they create.

The forms in code: Injecting collaborators in [javascript-and-typescript.md](javascript-and-typescript.md).

## What a receiver owes its senders (Liskov Substitution, generalised)

Widen Liskov Substitution from subclasses to every message: a sender must be able to trust what comes back. A receiver
returns one dependable kind of thing, so the sender never inspects or converts the result; whatever claims to play a
role answers all of that role's messages; and a method whose name promises an object like itself returns one that
behaves like it. A sender that checks a class, or asks whether an object answers a message, has to list the acceptable
kinds in a conditional; read each such check as polymorphism not used enough.

Use it when a sender branches on what it got back, or on what it was given. Steps:

1. Find the check in the sender: `instanceof`, `typeof`, an `in` test, a comparison with `null` or `undefined`, or a
   `kind` field read before deciding what to do. A conversion the sender applies to every result, with no check
   (`String(...)`, `Number(...)`), is the same distrust and counts too.
2. Name the message the sender wants to send whatever came back.
3. Make every kind the receiver can return, or every player of the role, answer that message. The empty case gets a
   player too (below).
4. Change the receiver to return only those, then delete the check in the sender. When several receivers or senders are
   involved, take this step through Accepting two kinds for a while in [changing-in-steps.md](changing-in-steps.md).

Done: the sender sends one message with no check before it, and every kind it can receive answers that message.

```ts
// Before: the sender inspects the result
const rate = taxes.rateFor(region);
const tax = typeof rate === 'number' ? amount * rate : rate.taxOn(amount);

// After: every result answers taxOn
const tax = taxes.rateFor(region).taxOn(amount);
```

### Values that keep a caller guessing

A method that sometimes returns an object and sometimes `null` or `undefined` is fine when callers only test for
presence. It costs when callers go on to send messages to the result, since every such caller then carries a guard and
its own stand-in behaviour. There, return something that answers the same messages in every case, such as an object for
the empty case (Sandi Metz).
