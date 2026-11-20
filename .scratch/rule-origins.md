# Origins of every rule, concept and Fallow check

Lars, 2026-11-20: "I would prefer that we don't invent concepts. lz-oop is based on oracle. Every concept, rule, or
Fallow check it includes should have an origin in oracle (Sandi Metz, Katrina Owen, and other sources they reference)."

## What each check detects (the question list for the oracles)

ESLint rules (`packages/eslint-plugin-lz-oop`), with the concept each message names today:

| # | Rule | Detects | Concept today | Cures named today |
| --- | --- | --- | --- | --- |
| 1 | max-lines-per-function, max-statements | a function with many lines or statements | Long Function | Extract Function |
| 2 | abc-size | a function with a high ABC size (assignments, branches i.e. calls, conditions) | Long Function | Extract Function, Replace Temp with Query, Decompose Conditional |
| 3 | flog-score | a function with a high Flog score (weighted ABC with nesting penalty) | Long Function | Extract Function, Replace Nested Conditional with Guard Clauses |
| 4 | halstead-volume | a function with a high Halstead volume (operators and operands) | Long Function | Extract Function, Introduce Parameter Object |
| 5 | cognitive-complexity | a function hard to follow (nesting-weighted branches) | Long Function | Guard Clauses, Extract Function |
| 6 | complexity | a function with high cyclomatic complexity | Complex Conditional | Decompose Conditional, Replace Conditional with Polymorphism, Introduce Special Case |
| 7 | max-depth | blocks nested deeply | Nested Conditionals | Replace Nested Conditional with Guard Clauses, Extract Function |
| 8 | max-class-lines | a class with many lines | Large Class | Extract Class |
| 9 | max-params | many parameters, counting keys read from an options object | Long Parameter List | Introduce Parameter Object, Preserve Whole Object, Remove Flag Argument |
| 10 | class-methods-use-this | a method that uses no state of its own object | Feature Envy | Move Function |
| 11 | type-hopping-chain | a call chain through several distinct types | Message Chains | Hide Delegate |
| 12 | switch-on-kind | a switch on an object's kind tag | Switch Statements | Replace Conditional with Polymorphism, a factory |
| 13 | ts-private | TypeScript `private` instead of a runtime-private `#field` | Inappropriate Intimacy | make it `#private` |
| 14 | module-let | a module-level `let` | Global Data | Encapsulate Variable |
| 15 | new-in-constructor | a constructor that creates its own collaborator with `new` | Hidden Dependency (no origin yet) | inject the collaborator, with a default |
| 16 | optional-collaborator | `this.x?.y`: asking whether a collaborator is present before sending it a message | Repeated Absence Check (no origin yet) | Introduce Special Case / Null Object |
| 17 | optional-private-field | an optional `#field` set for only part of the object's life | Temporary Field | Extract Class |

Fallow checks (`packages/fallow-config-lz-oop/fallowrc.json`): cyclomatic complexity (max 4), cognitive complexity
(max 4), CRAP score (complexity combined with missing test coverage), file length (max 250 lines), and change coupling
(files that change together, minimum degree 0.4).

## Oracle answers

(filled in per entry below)

### Fowler, *Refactoring*, 2nd edition (Claude's summary of the oracle report, 2026-11-20)

- No smell is named after a metric (ABC, Flog, Halstead, cyclomatic, cognitive); the smells chapter sets no thresholds.
  Mapping a metric to a smell is the plugin's own step. Rows 1-5: Long Function fits; its cure list includes Extract
  Function, Replace Temp with Query, Introduce Parameter Object, Preserve Whole Object, Replace Function with
  Command, Decompose Conditional, Replace Conditional with Polymorphism and Split Loop.
- Row 5: "Guard Clauses" is not a refactoring name; the name is Replace Nested Conditional with Guard Clauses.
- Rows 6-7: no smell "Complex Conditional" or "Nested Conditionals". The idea is the motivation of Decompose
  Conditional, Replace Conditional with Polymorphism and Replace Nested Conditional with Guard Clauses; nearest smell
  Long Function. Consolidate Conditional Expression also fits.
- Row 8: Large Class (cures Extract Class, Extract Superclass, Replace Type Code with Subclasses).
- Row 9: Long Parameter List (cures Replace Parameter with Query, Preserve Whole Object, Introduce Parameter Object,
  Remove Flag Argument, Combine Functions into Class); Data Clumps related. Counting options keys is the rule's own
  extension (sourced to the Metz talks instead).
- Row 10: Feature Envy fits only partly (a method using nothing from anywhere is not envy).
- Row 11: Message Chains (Hide Delegate, Extract Function, Move Function); beware Middle Man.
- Row 12: this edition renames the switch smell to Repeated Switches (one switch repeated in several places, not any
  single switch). "A factory" is not a refactoring name; Replace Constructor with Factory Function is.
- Row 13: no Inappropriate Intimacy in this edition; the counterpart is Insider Trading, which is not about
  language-level privacy. Possibly no Fowler origin for this rule.
- Row 14: Global Data and Mutable Data are separate; an unexported module `let` fits Mutable Data better (Global Data
  if exported). Encapsulate Variable cures both.
- Row 15: no smell and no refactoring for a constructor creating its collaborator.
- Row 16: no smell; the motivation of Introduce Special Case (earlier name Introduce Null Object) is repeated checks
  for one special value across many callers. Temporary Field lists Introduce Special Case as a cure.
- Row 17: Temporary Field (Extract Class, Move Function, Introduce Special Case).
- Fallow: CRAP and file length have no smell; change coupling's nearest smell is Shotgun Surgery (mirror: Divergent
  Change).
- Unread chapters: 1, 2, 4, 6-9, 11, 12.

### Metz, *Practical Object-Oriented Design*, 2nd edition (Claude's summary of the oracle report, 2026-11-20; whole book read)

- No smell catalogue; the frame is dependencies, single responsibility, interfaces, duck types, inheritance and
  composition. Smell names in the table come from Fowler, not from this book.
- Rows 1-7: no size or complexity measure. Ch.2 (one job per method) is the reason behind a length limit; Ch.1 says bad
  metric numbers are a dependable warning and good ones prove nothing, backing metrics as a family, not any one metric.
- Row 8: Single Responsibility (Ch.2, the one-sentence test) explains it better than size; Ch.9: many private methods
  signal too many jobs.
- Row 9: Ch.3 counts knowing the arguments, and their order, as dependencies; cures are keyword arguments, explicit
  defaults, and isolating multiparameter initialization. No count limit. Counting options keys has no origin here.
- Row 10: Ch.2 and Ch.7: behaviour that depends only on another object's data belongs in that object.
- Row 11: the Law of Demeter (Ch.4), judged by the kinds of objects each step returns, not by dots; cure: find the
  sender's goal and give the nearest object a public method for it. A better name than "Message Chains" here.
- Row 12: two named problems: branching on a receiver's class is an overlooked duck type (Ch.5, cure: define the
  message and trust the receivers); branching on an object's own category is an embedded type (Ch.6, cure: subclasses
  with template method and hooks, or composition with a factory, Ch.8).
- Row 13: Ch.4 treats visibility as a signal of stability, not enforcement; "make it #private" has no origin here.
- Row 14: not covered.
- Row 15: covered: knowing a concrete class name is a dependency (Ch.3); cure Inject Dependencies, depending on a role;
  defaulted injection in Ch.7 and Ch.8. Nuance: Isolate Instance Creation (moving `new` into the constructor) is the
  book's second-best form, better than a `new` buried in a working method. Ch.9: such coupling defeats isolated tests.
- Row 16: no Null Object, Special Case or absence name in the book; a nil check is a class check (Ch.5), and hook
  defaults in a parent remove the need to check (Ch.6, Ch.7).
- Row 17: Ch.6: fields set only for some instances signal an embedded type (not part of a lifetime).
- Fallow: complexity, CRAP and file length not covered; change coupling as a concept is Ch.3 (coupled objects change
  together; coupling between objects; likelihood of change against number of dependents), not history mining.
- Cited onward (POODR): Chidamber and Kemerer (1994), Basili (1995), Laing and Coleman (2001), Wirfs-Brock, Liskov, Gang of
  Four, Meyer, Booch, Fowler.

### Sandi Metz talks (Claude's summary of the oracle report, 2026-11-20; 10 of 28 transcripts read)

- Row 15: dependency injection, with a default that builds the usual collaborator (SOLID Object-Oriented Design, 2009;
  Get a Whiff of This, 2016; Nothing is Something, 2015). Creating a collaborator deep in a method is worse than in the
  initializer. "Hidden Dependency" is not her name.
- Row 16: the Null Object pattern (Nothing is Something, 2015): checks for nil before a message are type checks that
  multiply and lead to Shotgun Surgery; cure: a stand-in that answers the same message, and an adapter around an
  outside source of nil so the one check lives in one place. Credits "active nothing" to Bruce Anderson.
- Metrics: Flog, an ABC-style score, used as a second opinion beside judgement (All the Little Things, 2014); scores may
  rise during a refactoring before they fall; for many small classes read the worst and the mean, not the sum. The
  squint test (shape shows nesting). Paths through a method multiply with each conditional (Polly Want a Message,
  2018). Churn against complexity, after Michael Feathers, with Code Climate's chart (Polly Want a Message, 2018): the
  trouble spot is code that is both complex and changing often. Size limits: 100 lines a class, 5 a method, 4
  parameters, no dodging by a hash (Rules, 2013). Not found: Halstead, cognitive complexity, CRAP, coverage targets,
  file length, change coupling as a metric.
- Row 12: a case statement on a type (Go Ahead, Make a Mess, 2012): move each branch to its own class sharing one
  message, choose the class in a factory; Replace Conditional with Polymorphism named; template method as an alternative.
  All the Little Things: separate choosing from doing; keep case statements in factories.
- Row 13: Inappropriate Intimacy as reaching into another object's private methods (Get a Whiff of This, 2016); no
  language privacy mechanism discussed.
- Row 14: not found; only a stated preference for immutable objects (two podcasts).
- Rows 8-11, 17: Get a Whiff of This explains Fowler's smells in Mäntylä's five families: Large Class, Long Method,
  Long Parameter List, Data Clump (Extract Class), Feature Envy, Message Chains (Hide Delegate), Middle Man, Temporary
  Field.
- Cited onward (talks), see below: Fowler, Beck, Mäntylä, Industrial Logic's smells-to-refactorings table, Kerievsky, Reek, Flog,
  Code Climate, Feathers, Robert Martin, Freeman and Pryce, Gang of Four.

### Kerievsky, *Refactoring to Patterns* (Claude's summary of the oracle report, 2026-11-20; smells chapter only)

- Rows 1-5: Long Method; cures Compose Method plus pattern-directed ones (Collecting Parameter, Command, Visitor,
  Strategy). A size preference of roughly ten lines at most. No metric named.
- Row 6: **Conditional Complexity** is this entry's smell name (one of the smells it adds to Fowler and Beck's list).
  Cures by kind of branching: Replace Conditional Logic with Strategy, Move Embellishment to Decorator, Replace
  State-Altering Conditionals with State, Introduce Null Object.
- Row 7: no nesting smell; closest is Conditional Complexity.
- Row 8: Large Class (Extract Class, Extract Subclass, plus Command, State, Interpreter refactorings).
- Row 12: Switch Statements (the Fowler and Beck name, an if/else-if chain counts too; objectionable only once it makes
  change or understanding harder); cures Replace Conditional Dispatcher with Command, Move Accumulation to Visitor.
  Related: Primitive Obsession for a type code (Replace Type Code with Class, State, Strategy).
- Row 13: Indecent Exposure (clients see code they should not) is the nearest smell, about visibility to clients, not
  language enforcement.
- Row 14: no global-data smell; Lazy Class notes that a Singleton often leaves the design on effectively global data
  (Inline Singleton).
- Row 15: no smell; nearest are Solution Sprawl (creation code spread over many classes; Move Creation Knowledge to
  Factory) and Indecent Exposure.
- Row 16: **Introduce Null Object** is a cure listed under Conditional Complexity and Duplicated Code; no smell name for
  the check itself.
- Rows 9, 10, 11, 17, CRAP, file length: not covered. Change coupling: Solution Sprawl pairs with Shotgun Surgery.
- Unread: catalogue chapters 5-11.
