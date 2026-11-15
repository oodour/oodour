# Dependencies and messages

Use when a class creates or looks up its own collaborators, when a method reaches through one object
to another, or when a test needs a lot of setup to build the object under test.

## Message first

Decide first what message the sender wants to send, then find or invent the object that should answer
it (the talks Less, the Path to Better Design, 2011, and Go Ahead, Make a Mess, 2012; Ch.8, coding by
wishful thinking). A sender that walks a receiver through the steps of a job knows how the job is done,
and so depends on it.

## Reaching through other objects (the Law of Demeter)

The rule credited to Lieberherr, Holland and Riel: a method sends messages to itself, its arguments,
and the objects it holds or creates, not to objects those return (Ch.8).

1. Do not judge by counting dots. Ask whether each step in the chain hands back an object with a
   different interface. Stepping through several unrelated objects is the problem (Ch.8). By the
   same test, this skill reads a pipeline whose steps each return the same kind of value (array
   methods, a builder, a fluent query) as no violation.
2. Say what the chain costs: the sender breaks when any object along the way changes, it is hard to
   reuse elsewhere, its tests have to build the whole chain, and the intention behind it has no name
   (Ch.8; the talk Get a Whiff of This, 2016).
3. Cure it by asking the nearest collaborator for what the sender actually wants, through a message
   named for that intention (Hide Delegate; Get a Whiff of This, 2016). Name it for the goal, not by
   gluing together the names in the chain (Ch.8).
4. Reports and other code whose job is to gather data from many places are a reasonable exception
   (Ch.8).

## Injecting collaborators

1. Treat creating an object as a message too: a class that creates its collaborators is coupled to
   their concrete classes (Ch.8).
2. Pass the collaborator in. A default parameter value keeps existing callers unchanged while you
   make the move; the book treats that default as a step in the refactoring and later removes it
   (Ch.8 and Ch.9). Keeping a default for good, and putting it in an options object, are this skill's
   choices for callers that should not have to know the collaborator exists.
3. Name the parameter for the role the collaborator plays (a formatter, a clock, a gateway), not for
   the class that plays it today (Ch.8).
4. Where you can, pass in a ready instance rather than a class for the receiver to instantiate
   (Ch.8).
5. Move object creation outward, toward the code that starts the program, and keep concrete class
   names out of the methods that do the work (Ch.8).

TypeScript (this skill's inference): type the injected role as an interface or a type with only the
messages the receiver sends, so any object with those methods can play it, a test fake included.

## Values that keep a caller guessing

A method that sometimes returns an object and sometimes `null` or `undefined` is fine when callers
only test for presence. It costs when callers go on to send messages to the result: each one has to
check first and supply the missing behaviour itself. There, return something that answers the same
messages in every case, such as an object for the empty case (the article Suspicions of nil, 2014;
Nothing is Something, 2015).
