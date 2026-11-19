# Code smells

Use when you need a smell's name, how to spot it in JavaScript or TypeScript, its usual cure, or the leaf that holds
that cure. judging-design.md step 2 sends you here.

Contents: Bloaters; Object-oriented tools misused; Change preventers; Dispensables; Couplers; Outside the families.

A smell has a precise meaning, but it only says where to look: it may point at a problem, and it proves none. Nothing
obliges you to remove every smell, and code that never changes can keep its smells. There are no thresholds; the call is
the developer's judgement. Use the catalogue this way: learn the names so the team can talk about them, pick one smell
out of the tangle, and look up its cure instead of inventing one.

Where a smell is known by two names, both are given.

## Bloaters: code grown too large to handle

- **Long Method** (also Long Function): what matters is the gap between what a function is for and how it does it, not
  its line count. Cure and steps: Taking a long method apart in [changing-in-steps.md](changing-in-steps.md); Size
  limits, at the end of this family, say when to stop and look.
- **Large Class**: too many fields or too much code. Callers that each use only part of it show where to split it;
  Extract Class. Steps: Does it do one job? in [judging-design.md](judging-design.md).
- **Primitive Obsession** and **Data Clumps**: [judging-design.md](judging-design.md), Primitive Obsession and More
  smells.
- **Long Parameter List**: a function whose callers must supply many values, in TypeScript also an options object with
  many keys. An object is probably hiding in the list. Cures: Introduce Parameter Object for values that travel
  together, Preserve Whole Object instead of passing pieces of one structure, Replace Parameter with Query for a value
  the receiver can work out, Remove Flag Argument, and Combine Functions into Class when several functions share the
  values. The JavaScript forms: Parameter lists and options objects in
  [javascript-and-typescript.md](javascript-and-typescript.md); flag arguments:
  [variants-and-conditionals.md](variants-and-conditionals.md); changing the signature in green steps:
  [changing-in-steps.md](changing-in-steps.md).
- **Size limits** (not a smell; a cue to look for one): Sandi Metz's rules: a class of at most 100 lines, a method of at
  most 5, at most 4 parameters (packing more into one options object does not get round it), and a controller action
  that knows only one business object and one presenter and hands one object to its view. Any rule may be broken when
  you win over your pair. Lines a mixin brings into a class count toward the class's size. The numbers are arbitrary:
  reaching one is the cue to stop and ask whether to split, not a failure, and experienced developers should set their
  own. Use the team's limits where it has them; report a file over a limit as a place to look, not as a defect.

## Object-oriented tools misused

- **Switch Statements**: [variants-and-conditionals.md](variants-and-conditionals.md), Choosing versus doing. Its
  narrower form, Repeated Switches, is the same branching copied in several places; that leaf also reads a single switch
  that does each kind's work as this smell.
- **Refused Bequest**: [inheritance.md](inheritance.md), When a hierarchy is safe to keep. The smell is usually faint
  when a subclass skips some inherited behaviour, and serious when it rejects the parent's interface; then replace the
  inheritance with delegation.
- **Temporary Field**: a field that holds a value only in some states, so a reader cannot trust that the object needs
  it; in TypeScript, often an optional property (`total?: number`) set by one method and read by another. Cures: give
  the field a new class and bring the code that reads it along (Extract Class, then Move Function), and Introduce
  Special Case for the state where it has no value (the Null Object in
  [javascript-and-typescript.md](javascript-and-typescript.md) is one form).
- **Alternative Classes with Different Interfaces**: two classes that do the same job under different method names, so a
  caller cannot swap one for the other. Cure: give them the same signatures (Change Function Declaration), move
  behaviour until they match (Move Function), and pull up what is then shared (Extract Superclass). In TypeScript prefer
  having both implement one role over a shared parent: Roles in
  [javascript-and-typescript.md](javascript-and-typescript.md). When matching their messages leaves duplicated
  behaviour, give it one home in a shared parent or an extracted class both delegate to, once the steps of Duplication
  you are tempted to remove, in [duplication-and-abstraction.md](duplication-and-abstraction.md), say to merge (a
  trigger, the cost of waiting, one concept); until then leave the copies, as for Duplicated Code below.

## Change preventers: one change, many edits

- **Divergent Change**: one module edited for several unrelated reasons, each touching its own group of functions. It
  often shows only after a few such changes. Cure: split the concerns apart, with Split Phase when they run one after
  the other, otherwise Extract Function and Move Function, or Extract Class. Steps: Does it do one job? in
  [judging-design.md](judging-design.md).
- **Shotgun Surgery**: the reverse, one change that needs small edits in many files. Gather the pieces with Move
  Function and Move Field, or Combine Functions into Class; you may also inline the scattered pieces into one place
  first and split them again along better lines. The same `switch` on one union's `kind` in several files is a common
  source: [variants-and-conditionals.md](variants-and-conditionals.md).
- **Parallel Inheritance Hierarchies**: adding a subclass to one hierarchy forces a matching subclass in another. Cure:
  move the varying side behind a delegate the other side holds (Replace Subclass with Delegate), so the two variations
  change independently; the delegate may keep a hierarchy of its own. See When to move toward composition in
  [inheritance.md](inheritance.md).

## Dispensables: code that does not earn its place

- **Lazy Class** (also Lazy Element, which covers functions too): a class or function that does too little to pay for
  itself, such as a class around one small function or a function whose name says no more than its body. Cure: Inline
  Class or Inline Function, and Collapse Hierarchy inside a class tree. A one-line method that only forwards is not lazy
  when it names a goal of its callers that differs from the method it calls: callers then need to know only its name,
  not the other method's arguments and their meaning. Going further, hide even a one-line detail behind a method named
  for its intention, and keep a class's sibling predicates at one level of abstraction.
- **Speculative Generality**: structure for a need nobody has yet: a type parameter with one use, an optional parameter
  no caller passes, an abstract class with one subclass, code only tests call. Wait for the real requirement. Cure:
  Collapse Hierarchy, Inline Class or Inline Function, Change Function Declaration to drop unused parameters, and Remove
  Dead Code with its tests.
- **Data Class**: a class or type with only fields, while the logic about those fields lives in other modules. Cure:
  Encapsulate Record, Remove Setting Method for values that should not change, and Move Function to bring the behaviour
  in. A record that only carries one step's result to the next (Split Phase) is an exception, and so is data parsed at a
  boundary, such as a JSON payload, but only while nothing changes it and it simply feeds the next step. Once it
  spreads, gets modified, or logic about it gathers in other modules, it is a Data Class again: Encapsulate Record.
- **Duplicated Code**: [duplication-and-abstraction.md](duplication-and-abstraction.md). Judge it there before removing
  it; a wrong abstraction costs more than the copies.

## Couplers: objects tied too closely

- **Feature Envy**: a method that sends more messages to another object, often a run of its getters, than to its own.
  Cure: Move Function to the object whose data it uses, after Extract Function if only part of it envies; when it uses
  several, move it to the one it uses most. Strategy and Visitor separate behaviour from data on purpose and are not
  this smell.
- **Inappropriate Intimacy** (also Insider Trading): reaching into another object's private parts; in TypeScript, a
  bracket access or a cast that gets past `private`, or two modules that read each other's internal state. Those are its
  most visible forms: heavy data traffic both ways between two modules through public getters, and a subclass that
  relies on its parent's internals, are the same smell. Cure: Move Function and Move Field to cut the traffic, a third
  module for what both need, or Hide Delegate; a subclass that knows too much of its parent moves to delegation. Private
  state in JavaScript: [javascript-and-typescript.md](javascript-and-typescript.md), Private state.
- **Message Chains**: [dependencies-and-messages.md](dependencies-and-messages.md), Reaching through other objects.
- **Middle Man**: a class whose methods mostly only forward, about half of them. Cure: Remove Middle Man, or Inline
  Function for a few forwarders. Forwarding as such is normal, and hiding every link of a chain can create one. A class
  that only relays calls stays when it keeps a duty of its own, such as choosing which object to build, and may be
  unnecessary when it keeps none.

## Outside the families

- **Comments**: a comment that explains what unclear code does is the smell, not comments as such. Cure: Extract
  Function or a rename (Change Function Declaration), and Introduce Assertion for an assumption about state. Prefer
  names and structure that carry the signal, under a style the team agrees on, to comments that go stale.
- **A query that also changes state**: a function called for its answer that also alters its argument, its object or
  something outside, often named with an "And" joining the two jobs. A caller that only wants the answer gets the change
  too. A description of what it does that needs "and" is the cue. Cure: Separate Query from Modifier, a function that
  only answers and one that only changes.
- **Mysterious Name**, **Global Data**, **Mutable Data** and **Loops** are smells too. For names, see Naming in
  [duplication-and-abstraction.md](duplication-and-abstraction.md).

Done looks like: each finding names one smell, says what change it makes expensive, and names the cure from the leaf
this file points to, read before you recommend it.
