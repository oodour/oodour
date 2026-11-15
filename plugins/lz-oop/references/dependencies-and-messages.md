# Dependencies and messages

Use when a class creates or looks up its own collaborators, when a method reaches through one object
to another, or when a test needs a lot of setup to build the object under test.

## Message first

Decide first what message the sender wants to send, then find or invent the object that should answer
it (the talks Less, the Path to Better Design, 2011, and Go Ahead, Make a Mess, 2012; coding by
wishful thinking, from *99 Bottles of OOP*). A sender that walks a receiver through the steps of a job
knows how the job is done, and so depends on it.

## Reaching through other objects (the Law of Demeter)

The rule comes from a 1988 paper by Lieberherr, Holland and Riel, which *99 Bottles of OOP* lists among
its references: a method sends messages to itself, its arguments, and the objects it holds or creates,
not to objects those return (the book).

1. Do not judge by counting dots. Ask whether each step in the chain hands back an object with a
   different interface. Stepping through several unrelated objects is the problem (the book). By the
   same test, this plugin reads a pipeline whose steps each return the same kind of value (array
   methods, a builder, a fluent query) as no violation.
2. Say what the chain costs: the sender breaks when any object along the way changes, it is hard to
   reuse elsewhere, its tests have to build the whole chain, and the intention behind it has no name
   (the book; the talk Get a Whiff of This, 2016).
3. Cure it by asking the nearest collaborator for what the sender actually wants, through a message
   named for that intention (Hide Delegate; Get a Whiff of This, 2016). Name it for the goal, not by
   gluing together the names in the chain (the book).
4. Reports and other code whose job is to gather data from many places are a reasonable exception
   (the book).

## Injecting collaborators

1. Treat creating an object as a message too: a class that creates its collaborators is coupled to
   their concrete classes (*99 Bottles of OOP*).
2. Pass the collaborator in. A default parameter value keeps existing callers unchanged while you
   make the move; the book treats that default as a step in the refactoring and later removes it.
   Its reason: a default chosen for the first caller ties the class to the place it came from,
   suggests that place still matters, and the class has no basis for choosing one, so once every
   test passes the collaborator explicitly, callers always supply it.
   Her article SOLID Design Principles - Dependency Injection (2009) takes the other view and keeps
   the collaborator default as a lasting part of the design. This plugin follows the article where
   most callers of a public class want the same collaborator and should not have to know it exists,
   and puts the default in an options object.
   Drop the default as the book does when the class is reused in a second context, or when the default
   names something from the class's original setting.
3. Name the parameter for the role the collaborator plays (a formatter, a clock, a gateway), not for
   the class that plays it today (the book).
4. Where you can, pass in a ready instance rather than a class for the receiver to instantiate
   (the book).
5. Move object creation outward, toward the code that starts the program, and keep concrete class
   names out of the methods that do the work (the book). Of two possible dependencies, depend on the
   one less likely to change (below, Which way a dependency points); *99 Bottles of OOP* applies this
   when choosing what a factory's candidates should depend on.
6. Put domain behaviour on instances, not on static methods or bare class-level functions. Static
   code bets that the concept will never hold varying data, and it is hard to refactor when that bet
   loses; creating an instance costs almost nothing, so the book creates one every time. A static
   method that only builds an instance and delegates to it is fine (the book).
7. Isolate what varies behind a role and inject it, so the code that stays the same does not change
   when a new variant arrives (the book).

TypeScript (this plugin's inference): type the injected role as an interface or a type with only the
messages the receiver sends, so any object with those methods can play it, a test fake included.
The forms in code: Injecting collaborators in [javascript-and-typescript.md](javascript-and-typescript.md).

## Which way a dependency points

Use when deciding which of two collaborators should know about the other, or when a class that many others use
keeps changing.

1. Every dependency has a direction, chosen on purpose or by accident; point it at the side less likely to change
   than the one that depends on it (the talks SOLID Object-Oriented Design, 2009, and Less, the Path to Better
   Design, 2011). Stability is relative: what matters is only that the thing depended on is steadier than its
   dependent (Go Ahead, Make a Mess, 2012).
2. Weigh three facts about the candidate (*Practical Object-Oriented Design*): how often its requirements are likely
   to change, whether it is concrete or abstract (abstractions change less than the concrete classes they came from),
   and how many others depend on it (each change reaches every dependent).
3. Place it on the book's grid of likelihood of change against number of dependents. Steady with many dependents
   is usually an abstraction, and fine; changeable with few dependents is usually concrete code, and fine because
   little relies on it; steady with few dependents hardly matters. The costly corner is changeable with many
   dependents: each edit spreads to them all. Suspect a concrete class with many dependents of sitting there even
   when it looks stable (the book).
4. Prefer depending on a message to depending on a class: a sender that knows only what it wants to ask, not which
   class answers, survives a change of class (Less, 2011; Go Ahead, Make a Mess, 2012). Saying that message names
   are steadier than class names is this plugin's summary of those talks, not a sentence from them.
5. When neither side is clearly steadier, do not guess a direction: cut what each side knows of the other to the
   least, with each side expecting a role rather than a class (Less, 2011).

Dependency Inversion is the name for the end state: neither the higher-level class nor its collaborator depends on
the other's concrete class; both depend on a role (*99 Bottles of OOP*; the SOLID talk, 2009, reads it as favouring
abstractions over concrete classes). Done (this plugin's test, drawn from the book's advice to keep concrete class
names out of instance methods): the receiver's methods name no concrete collaborator class, only the role it plays,
and the concrete class is chosen where objects are created.

## Interfaces you do not own

Use when code calls a library, a framework or a collaborator whose interface may change and that you cannot change.

1. Wrap creation of a third-party object behind one method or module of your own, so only that place knows its
   constructor's shape, such as a fixed argument order; the rest of the code calls your wrapper with named options
   (*Practical Object-Oriented Design*, and her example code for the book). The book calls an object made only to
   build others a factory, and wants application code to depend on what the application owns.
2. Wrap a risky outgoing message to a collaborator in a method of the sender's own, even before any duplication
   exists: if the collaborator renames the message or changes its arguments, one method changes. This is the
   exception to waiting for duplication; keep it for the messages most likely to change (the book).
3. When you cannot inject a collaborator yet, isolate its creation: build it in the constructor, or on first use in
   a dedicated method that builds it once. Either keeps creation out of the method that does the work and makes
   the dependency visible, though the class still knows its collaborator's class (the book). The SOLID talk (2009) then turns that
   creation into a constructor argument whose default is the new instance. TypeScript form (this plugin's): a
   `#field` set with `??=` in a private getter.
4. When only the receiver knows an argument needed to build its collaborator, so the caller cannot pass a ready
   instance, inject the class instead and send it one message that asks for the result the receiver wants, with
   creation hidden behind it. Creating an object is a message too, so creating one and then asking it for something
   is a chain of the kind the Law of Demeter flags (*99 Bottles of OOP*). TypeScript form (this plugin's): inject a
   factory function typed by the role, or by the result.

Done: one place in your code knows each foreign interface, and the receiver's working methods name no class they
create.

The forms in code: Injecting collaborators in [javascript-and-typescript.md](javascript-and-typescript.md).

## What a receiver owes its senders (Liskov Substitution, generalised)

*99 Bottles of OOP* widens Liskov Substitution from subclasses to every message: a sender must be able to trust
what comes back. A receiver returns one dependable kind of thing, so the sender never inspects or converts the
result; whatever claims to play a role answers all of that role's messages; and a method whose name promises an
object like itself returns one that behaves like it. A sender that checks a class, or asks whether an object answers a
message, has to list the acceptable kinds in a conditional; the book reads each such check as polymorphism not used
enough.

Use it when a sender branches on what it got back, or on what it was given. Steps (this plugin's restatement):

1. Find the check in the sender: `instanceof`, `typeof`, an `in` test, a comparison with `null` or `undefined`, or a
   `kind` field read before deciding what to do.
2. Name the message the sender wants to send whatever came back.
3. Make every kind the receiver can return, or every player of the role, answer that message. The empty case gets a
   player too (below).
4. Change the receiver to return only those, then delete the check in the sender.

Done: the sender sends one message with no check before it, and every kind it can receive answers that message.

```ts
// Before: the sender inspects the result
const rate = taxes.rateFor(region);
const tax = typeof rate === 'number' ? amount * rate : rate.taxOn(amount);

// After: every result answers taxOn
const tax = taxes.rateFor(region).taxOn(amount);
```

### Values that keep a caller guessing

A method that sometimes returns an object and sometimes `null` or `undefined` is fine when callers
only test for presence. It costs when callers go on to send messages to the result, since every such
caller then carries a guard and its own stand-in behaviour. There, return something that answers the same
messages in every case, such as an object for the empty case (the article Suspicions of nil, 2014;
Nothing is Something, 2015).
