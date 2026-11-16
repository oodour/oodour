# Code smells

Use when you need a smell's name, how to spot it in JavaScript or TypeScript, its usual cure, or the leaf that
holds that cure. judging-design.md step 2 sends you here.

Contents: Bloaters; Object-oriented tools misused; Change preventers; Dispensables; Couplers; Outside the families.

A smell has a precise meaning, but it only says where to look: it may point at a problem, and it proves none. Nothing
obliges you to remove every smell, and code that never changes can keep its smells (the talk Get a Whiff of This,
2016). Martin Fowler's *Refactoring*, 2nd edition, likewise gives no thresholds and leaves the call to the
developer's judgement. Both credit Kent Beck with the idea of smells. Use the catalogue this way (Get a Whiff of
This, 2016): learn the names so the team can talk about them, pick one smell out of the tangle, and look up its cure
instead of inventing one.

The families below are a grouping from a research paper by Mika Mäntylä, which the talk presents. The smell names
and the cures are *Refactoring*, 2nd edition, unless an entry says otherwise; where that edition renamed a smell,
both names are given. How each smell shows in JavaScript or TypeScript is this plugin's reading.

## Bloaters: code grown too large to handle

- **Long Method** (*Refactoring* 2nd edition: Long Function): what matters is the gap between what a function is for
  and how it does it, not its line count (*Refactoring*). Cure and steps: Taking a long method apart in
  [changing-in-steps.md](changing-in-steps.md); the size limits in the `lz-audit` skill
  ([SKILL.md](../skills/lz-audit/SKILL.md), step 2, Size limits) say when to stop and look.
- **Large Class**: too many fields or too much code. Callers that each use only part of it show where to split it;
  Extract Class (*Refactoring*). Steps: Does it do one job? in [judging-design.md](judging-design.md).
- **Primitive Obsession** and **Data Clumps**: [judging-design.md](judging-design.md), Primitive Obsession and More
  smells.
- **Long Parameter List**: a function whose callers must supply many values, in TypeScript also an options object with
  many keys. An object is probably hiding in the list (Get a Whiff of This, 2016). Cures: Introduce Parameter Object
  for values that travel together, Preserve Whole Object instead of passing pieces of one structure, Replace Parameter
  with Query for a value the receiver can work out, Remove Flag Argument, and Combine Functions into Class when several
  functions share the values (*Refactoring*). The JavaScript forms: Parameter lists and options objects in
  [javascript-and-typescript.md](javascript-and-typescript.md); flag arguments:
  [variants-and-conditionals.md](variants-and-conditionals.md); changing the signature in green steps:
  [changing-in-steps.md](changing-in-steps.md).

## Object-oriented tools misused

- **Switch Statements**: [variants-and-conditionals.md](variants-and-conditionals.md), Choosing versus doing.
  *Refactoring*, 2nd edition, narrows this smell to Repeated Switches, the same branching copied in several places,
  and no longer counts a single switch; that leaf keeps its stricter reading for a switch that does each kind's work.
- **Refused Bequest**: [inheritance.md](inheritance.md), When a hierarchy is safe to keep. *Refactoring* adds that the
  smell is usually faint when a subclass skips some inherited behaviour, and serious when it rejects the parent's
  interface; then replace the inheritance with delegation.
- **Temporary Field**: a field that holds a value only in some states, so a reader cannot trust that the object needs
  it; in TypeScript, often an optional property (`total?: number`) set by one method and read by another. Cures: give
  the field a new class and bring the code that reads it along (Extract Class, then Move Function), and Introduce
  Special Case for the state where it has no value (*Refactoring*; the Null Object in
  [javascript-and-typescript.md](javascript-and-typescript.md) is one form). Get a Whiff of This (2016) describes it
  closer to a temporary variable that would be better as a method; mapping that to Replace Temp with Query is this
  plugin's, and this plugin follows the book's sense.
- **Alternative Classes with Different Interfaces**: two classes that do the same job under different method names, so
  a caller cannot swap one for the other. Cure: give them the same signatures (Change Function Declaration), move
  behaviour until they match (Move Function), and pull up what is then shared (Extract Superclass) (*Refactoring*).
  In TypeScript this plugin prefers having both implement one role over a shared parent: Roles in
  [javascript-and-typescript.md](javascript-and-typescript.md).

## Change preventers: one change, many edits

The talk leaves this family unnamed; the name here is this plugin's.

- **Divergent Change**: one module edited for several unrelated reasons, each touching its own group of functions.
  It often shows only after a few such changes. Cure: split the concerns apart, with Split Phase when they run one
  after the other, otherwise Extract Function and Move Function, or Extract Class (*Refactoring*). Steps: Does it do
  one job? in [judging-design.md](judging-design.md).
- **Shotgun Surgery**: the reverse, one change that needs small edits in many files (*Refactoring*). Gather the pieces
  with Move Function and Move Field, or Combine Functions into Class; the book also allows inlining the scattered
  pieces into one place first and splitting them again along better lines. The same `switch` on one union's `kind` in
  several files is a common source: [variants-and-conditionals.md](variants-and-conditionals.md).
- **Parallel Inheritance Hierarchies**: adding a subclass to one hierarchy forces a matching subclass in another
  (Get a Whiff of This, 2016). *Refactoring*, 2nd edition, drops it from its catalogue. The cure here is this plugin's
  reading: let one side hold the other as a collaborator instead of mirroring it, so only one hierarchy remains; see
  When to move toward composition in [inheritance.md](inheritance.md).

## Dispensables: code that does not earn its place

- **Lazy Class** (*Refactoring* 2nd edition: Lazy Element, which covers functions too): a class or function that does
  too little to pay for itself, such as a class around one small function or a function whose name says no more than
  its body. Cure: Inline Class or Inline Function, and Collapse Hierarchy inside a class tree (*Refactoring*). A
  one-line method that only forwards is not lazy when it names a goal of its callers that differs from the method it
  calls: callers then need to know only its name, not the other method's arguments and their meaning (*99 Bottles of
  OOP*).
- **Speculative Generality**: structure for a need nobody has yet: a type parameter with one use, an optional
  parameter no caller passes, an abstract class with one subclass, code only tests call. Wait for the real requirement
  (Get a Whiff of This, 2016). Cure: Collapse Hierarchy, Inline Class or Inline Function, Change Function Declaration
  to drop unused parameters, and Remove Dead Code with its tests (*Refactoring*). The name is Brian Foote's, as
  *Refactoring* credits.
- **Data Class**: a class or type with only fields, while the logic about those fields lives in other modules. Cure:
  Encapsulate Record, Remove Setting Method for values that should not change, and Move Function to bring the
  behaviour in (*Refactoring*). The book excepts a record that only carries one step's result to the next (Split
  Phase); this plugin reads data parsed at a boundary, such as a JSON payload, the same way.
- **Duplicated Code**: [duplication-and-abstraction.md](duplication-and-abstraction.md). Judge it there before
  removing it; a wrong abstraction costs more than the copies.

## Couplers: objects tied too closely

- **Feature Envy**: a method that sends more messages to another object, often a run of its getters, than to its own.
  Cure: Move Function to the object whose data it uses, after Extract Function if only part of it envies; when it uses
  several, move it to the one it uses most (*Refactoring*). Strategy and Visitor separate behaviour from data on
  purpose and are not this smell (*Refactoring*).
- **Inappropriate Intimacy** (*Refactoring* 2nd edition: Insider Trading): reaching into another object's private parts
  (Get a Whiff of This, 2016); in TypeScript, a bracket access or a cast that gets past `private`, or two modules that
  read each other's internal state. Cure: Move Function and Move Field to cut the traffic, a third module for what both
  need, or Hide Delegate; a subclass that knows too much of its parent moves to delegation (*Refactoring*). Private
  state in JavaScript: [javascript-and-typescript.md](javascript-and-typescript.md), Private state.
- **Message Chains**: [dependencies-and-messages.md](dependencies-and-messages.md), Reaching through other objects.
- **Middle Man**: a class whose methods mostly only forward, about half of them in *Refactoring*'s telling. Cure:
  Remove Middle Man, or Inline Function for a few forwarders (*Refactoring*). Forwarding as such is normal, and hiding
  every link of a chain can create one (*Refactoring*). A class that only relays calls stays when it keeps a duty of
  its own, such as choosing which object to build, and may be unnecessary when it keeps none (the talks All the
  Little Things, 2014, and Get a Whiff of This, 2016).

## Outside the families

- **Comments**: not named in the talk. A comment that explains what unclear code does is the smell, not comments as
  such. Cure: Extract Function or a rename (Change Function Declaration), and Introduce Assertion for an assumption
  about state (*Refactoring*).
- *Refactoring*, 2nd edition, also adds Mysterious Name, Global Data, Mutable Data and Loops. For names, see Naming in
  [duplication-and-abstraction.md](duplication-and-abstraction.md).

Done looks like: each finding names one smell, says what change it makes expensive, and names the cure from the leaf
this file points to, read before you recommend it.
