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

## Proposed mapping (Claude, 2026-11-20, from the answers below; awaiting Lars)

| Check | Smell (concept) | Origin of the check | Cures | Proposal |
| --- | --- | --- | --- | --- |
| max-lines-per-function, max-statements | Long Function | five-line method rule (Rules, 2013) | Extract Function | keep |
| abc-size | Long Function | ABC (99 Bottles Ch.1, Fitzpatrick 1997) | Extract Function, Replace Temp with Query, Decompose Conditional | keep |
| flog-score | Long Function | Flog (All the Little Things, 2014; POODR panel, 2021; Sokoban code) | as above, plus Replace Nested Conditional with Guard Clauses | keep |
| halstead-volume | - | none found | - | drop |
| cognitive-complexity (ESLint and Fallow) | - | none by name; the squint test is the nearest idea | - | drop |
| complexity (ESLint and Fallow cyclomatic) | Conditional Complexity (Kerievsky) | cyclomatic (99 Bottles Ch.1, McCabe 1976) | Replace Conditional with Polymorphism, Decompose Conditional, Replace Conditional Logic with Strategy | keep, rename concept |
| max-depth | Conditional Complexity | nested conditionals (Why Are Computers #3, 2016; squint test) | Replace Nested Conditional with Guard Clauses, Extract Function | keep, rename concept |
| max-class-lines | Large Class | 100-line class rule (Rules, 2013) | Extract Class | keep |
| max-params | Long Parameter List | four-parameter rule, no hash dodge (Rules, 2013) | Introduce Parameter Object, Preserve Whole Object, Remove Flag Argument | keep |
| class-methods-use-this | Feature Envy | Fowler; Owen (Overkill, 2014) | Move Function | keep strict; the book's constant-returning overrides need `override` to pass |
| type-hopping-chain | Message Chains | Law of Demeter judged by changing types (POODR Ch.4, 99 Bottles Ch.8) | Hide Delegate; a message named for the sender's goal | keep |
| switch-on-kind | Switch Statements (99 Bottles, Kerievsky; Fowler 2e: Repeated Switches) | case on type (Go Ahead, Make a Mess, 2012; 99 Bottles Ch.6-7) | Replace Conditional with Polymorphism, the choice moved into a factory | keep |
| ts-private | - | none; Metz treats privacy as a signal, not enforcement | - | drop |
| module-let | Mutable Data (Global Data when exported) | Fowler; class-held data lives forever (If You Build It, 2022) | Encapsulate Variable | keep, rename concept |
| new-in-constructor | no smell named in any source | concrete class name as a dependency (POODR Ch.3, 99 Bottles Ch.8, SOLID OOD 2009) | Inject Dependencies, with a default | Lars to choose the concept |
| optional-collaborator | Conditional Complexity (Kerievsky lists Introduce Null Object under it) | nil checks as repeated type checks (Suspicions of nil, 2014; Nothing is Something, 2015) | Introduce Null Object, Introduce Special Case | keep, rename concept |
| optional-private-field | Temporary Field | Fowler | Extract Class, Introduce Special Case | keep |
| Fallow CRAP | - | none | - | drop |
| Fallow file length | - | none; Metz puts several small classes in one file | - | drop (class length stays) |
| Fallow change coupling | Shotgun Surgery | POODR Ch.3 (coupled objects change together); churn against complexity (Behemoth, 2017; Polly, 2019) | Move Function, Move Field | keep; prefer Fallow's churn-and-complexity hot spots if it has them |

The Ruby companion code (oracle report, 2026-11-20) has no metric tooling (no Flog, Reek, RuboCop or SimpleCov config,
no coverage); it shows the factory forms, injection by keyword argument with a default (later required), and the zero
case as its own subclass. Commit messages were unreadable in both companion clones.

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

### Metz, Owen and Stankus, *99 Bottles of OOP*, 2nd edition, JavaScript (Claude's summary of the oracle report, 2026-11-20; all chapters read)

- Metrics, Ch.1: lines of code (volume, not quality), cyclomatic complexity (McCabe 1976: paths through the code; pick
  the lower of two versions, cap it with permission to exceed, read it as the least number of tests that reach every
  branch), ABC (Fitzpatrick 1997: assignments, branches as message sends, conditions; mental size; a high score warns
  of code costly to test and change). Tables in Ch.1 and Ch.2. No thresholds; no JavaScript metrics tool. Ch.4: scores
  can look worse after a refactoring that improved the code; Ch.5: ABC rose after extracting a class. Not in the book:
  Flog, Halstead, cognitive complexity as a word, CRAP, churn, change coupling.
- Row 1: Long Function named once (Ch.8), caused by a conditional and cured through the switch; a blank line inside a
  method hints at more than one job.
- Row 5: the Squint Test (Ch.5): indentation shows conditionals and nesting, colour shows mixed abstraction.
- Row 6: conditionals are suspect in OO code (Ch.3, Ch.5); cure Replace Conditional with Polymorphism (Ch.6).
- Row 7: nested ternaries and the Squint Test; no named refactoring for nesting.
- Row 8: Large Class only as a sample name; Extract Class applied (Ch.5, Ch.8); Single Responsibility (Ch.3).
- Row 9: no Long Parameter List; knowing a message's arguments is a dependency (Ch.2); the same argument across methods
  is a smell (Ch.5); Data Clump (Ch.6), cured by extracting a class.
- Row 10: Feature Envy only as a sample name; methods leaning on a passed value point to Primitive Obsession (Ch.5).
- Row 11: the Law of Demeter (Ch.8; the 1988 paper), judged by whether each hop changes interface; cure: a message named
  for what the sender wants; inject the object you will message.
- Row 12: Switch Statement (Ch.3, Ch.6); Primitive Obsession as the root (Ch.5); Replace Conditional with Polymorphism
  (Ch.6); factories (Ch.6, Ch.7): branching to choose a class is legitimate, branching on behaviour is not. Class
  sniffing or method probing before a message breaks the broadened Liskov principle.
- Row 13: not covered (no language privacy).
- Row 14: not covered; Ch.5 argues for objects that don't change.
- Row 15: Ch.8: a hard-coded class name couples to a concretion; cure by dependency inversion through injection, with
  a constructor default (later removed as a leftover, Ch.9); keep instantiation at the edges; a named factory class is
  an accepted exception.
- Row 16: no Null Object or Special Case; the broadened Liskov principle (Ch.4, Ch.6): a caller that must inspect what
  it got has an unreliable collaborator; fix the receiver with polymorphism.
- Row 17: not covered.
- Fallow: cyclomatic covered (Ch.1, Ch.2); cognitive see row 5; CRAP, file length limit and change coupling absent
  (Shotgun Surgery and Divergent Change only as sample names).
- Cited onward: Fowler (both editions; smells and recipes, with Beck), Kerievsky, Gang of Four, Meszaros, Beck (TDD,
  Implementation Patterns, horizontal and vertical refactoring), McCabe, Fitzpatrick, the Demeter paper, Robert Martin
  (Dependency Inversion, 1996), Feathers.

### Katrina Owen talks (Claude's summary of the oracle report, 2026-11-20; all 3 read)

- No metric of any kind, no thresholds. Length is not the measure: a short method can do several jobs; the test is
  what the two things would be if it were split (Overkill, 2014; Succession, 2016).
- Row 1: a huge method's smells (size, mixed abstraction, unnamed chunks); cures Replace Method with Method Object, then
  Extract Method (Therapeutic Refactoring, 2012). The squint test, credited to Metz (Overkill).
- Coverage as practice: characterization tests until every line and branch runs (Therapeutic Refactoring); no number.
- Row 6: a conditional attracts more conditionals; shrink branches to the smallest difference, name the concept, find
  the object (Succession).
- Row 10: Feature Envy, named (Overkill); a method depending only on its argument moves to a new object (Succession).
- Row 12: Replace Conditional with Polymorphism, credited to Fowler (Succession), with a small object choosing the
  class.
- Row 15: defaulted constructor data (Succession); no injection terminology.
- Row 17: short-lived per-call data kept in instance state, cured by passing it as an argument (Overkill).
- Rows 9, 11, 13, 14, 16, churn, CRAP, change coupling: not covered.
- Cited onward: Fowler, Metz, Beck (Smalltalk Best Practice Patterns), Wake and Rutherford (Refactoring Workbook),
  Hickey, Helmkamp.

### Sandi Metz articles, interviews and example code (Claude's summary of the oracle report, 2026-11-20)

- No prose names Flog, ABC, Halstead, cyclomatic or cognitive complexity, CRAP, a coverage target, or a line or
  parameter limit; no metric tool config in any repository.
- Metric artefacts in code: her `play` Sokoban exercise keeps saved Flog and Saikuro (cyclomatic) reports for her
  solution and a reference one; she compares the Flog total (hers higher) and the per-method average (hers lower, many
  small classes). No threshold of her own.
- Churn against complexity: Breaking Up the Behemoth (2017), after Feathers, with Code Climate's charts: the target is
  tangled code edited often; cure: stop growing the big class and meet new requests with small collaborating classes.
  The Half-Life of Code (2017): cost comes from change; make the churning code cheap to replace.
- Reading numbers: InfoQ interview (2013): tools count, people judge; AMA (2018): coverage and quality tools show the
  trend and the danger zones, with a pinch of salt.
- CRAP, coverage, Halstead, cognitive complexity, nesting, file length, language privacy: not covered.
- Row 6, 12: What Does OO Afford? (2018), The Shape at the Bottom of All Things (2014), Ruby Case Statements and
  kind_of? (2009): branching on a type is a smell; cure: role players, a factory to choose, injection. Make Everything
  The Same (2016); The Wrong Abstraction (2016). Workshop code turning conditionals into objects.
- Row 9 caution: the 2009 dependency-injection article and the POODR chapter 3 example code recommend an options hash
  with defaults; counting its keys runs against that advice, while Rules (2013) forbids the hash as a way under the
  limit. max-params counts keys only for untyped or inline-typed parameters.
- Row 14: not a smell here; preference for objects that don't change (AMA 2018).
- Row 15: dependency injection with defaults that build the usual collaborator (2009 article; example code). Her cure
  keeps `new` as a default argument: `new-in-constructor` checks only the constructor body, so a default parameter
  value is not reported (Claude's check of the selector).
- Row 16: Suspicions of nil (2014): returning nil or a real object gives senders two types; every nil test, truthiness
  test or `try` is a type check repeated in each caller; cure named: the Null Object pattern (its follow-up post is
  not in the store). Optional chaining is JavaScript's `try` (inference). A farm-song exercise is built for this.
- Row 17: a field assigned under one condition with a lazy fallback elsewhere is one conditional split apart (code-shape
  article and code).
- Cited onward: Feathers, Code Climate, Fowler (Design Stamina), Robert Martin, Dan North, Beck, Freeman and Pryce,
  Evans, Jay Fields, Kerievsky, Gang of Four, Wirfs-Brock.

### Sandi Metz talks, the other 18 transcripts (Claude's summary of the oracle report, 2026-11-20)

- Churn against complexity (Polly Want a Message, 2019; Bike Shed LIVE, 2016; Making is Easy, Mending is a Challenge):
  her name for the class in the complex-and-changing corner is the Death Star anti-pattern (big, full of
  conditionals, the core domain object); complex code that never changes can be left alone.
- Tools (POODR panel, 2021): Code Climate scores, Flog, Reek, CodeScene (who changes what, how often, how complex);
  metrics are not infallible but reproducible; a huge complex file says something different from complexity spread
  over small files.
- Each conditional doubles the paths through a method (Polly Want a Message, 2019): the idea of cyclomatic complexity,
  not its name. Steady velocity as the test of good-enough design (Defining Object-Oriented Design).
- Size rules (Ruby Rogues #87, 2013; Toronto 2013; Purpose of Rules, 2014; Bike Shed LIVE, 2016; Making is Easy): norms
  that prompt the question "should this be two objects?"; each shop sets its own; a mixed-in module still counts
  toward the class; no hash to get under the parameter limit; three might have been better than four.
- File length: she argues for several small related classes in one file (Making is Easy; Go Ahead, Make a Mess 2017),
  which a file-length check runs against.
- Not found: Halstead, cognitive complexity, CRAP, ABC or cyclomatic complexity by name, coverage targets.
- Row 7: big nested conditionals are one of the two problems she finds everywhere (Why Are Computers #3, 2016); cure by
  the Flocking Rules.
- Row 9: a boolean flag argument is a smell; cure: inject a role-playing object (Polly Want a Message, 2019).
- Row 12: one duck-typed class per branch chosen by a factory; open and closed factories (If You Build It, 2022);
  control coupling named (Triangle.rb 2013); branching on stable built-in classes is acceptable (Toronto 2013).
- Row 13: she rarely marks methods private; privacy signals instability (The Design of Tests; Bike Shed LIVE, 2016).
  No origin for enforced runtime privacy.
- Row 14: data held on a class lives for the whole program and is never collected; keep accumulating data on an
  instance (If You Build It, 2022); preference for immutability (Fireside Chat, 2015).
- Row 15: never hard-code another class's name inside a class; inject it with a default (Defining Object-Oriented
  Design); cheap lottery tickets (Ruby Rogues #87, 2013); stable built-ins may be created directly (Toronto 2013).
- Row 16: the Null Object pattern (Ruby Rogues #87; Triangle.rb 2013); absence modelled as an object (Fireside Chat,
  2015); stand-ins answering the same message (Polly Want a Message, 2019).
- Row 17: optional arguments stored and branched on later; cure by injecting role players (Polly Want a Message, 2019).
- Cited onward: Freeman and Pryce, Robert Martin, Feathers, Fowler, Wirfs-Brock, Beck, Evans, Gang of Four, Kerievsky,
  Hickey, Kay, Liskov.

### *99 Bottles* JavaScript companion code (Claude's summary of the oracle report, 2026-11-20; commit messages unreadable)

- No metric tooling: dev tools are a transpiler, the test runner and ESLint with the recommended preset plus four style
  rules; no complexity, size or parameter rules, no coverage collection. Size limits show only in the code's shape
  (most methods one expression or a few lines; classes 5-50 lines; files well under 250 lines).
- Row 12: the choosing conditional moves into a factory that switches on the raw number; the factories stages try a
  lookup table, candidates that say whether they handle a value, and self-registration on a static array.
- Row 15: a `new` inside a working method becomes a constructor parameter with a default, later without one; the tests
  pass a fake that a shared role check verifies.
- Row 16: no absence handling; special values (0, 1, 6) become subclasses chosen by the factory (Special Case by
  subclass, Claude's label).
- Row 10: subclass methods that return constants and use no instance state are accepted for polymorphic overrides,
  which `class-methods-use-this` would report.

### *99 Bottles* JavaScript companion code, commit and tag history (Claude's summary of the oracle report, 2026-11-21; 603 commits, 559 tags read)

- Messages are one-line micro-steps. None names a metric, a tool, coverage, CRAP, privacy, Null Object, Special Case or
  a smell from Fowler's catalogue. Named practices: Shameless Green, Liskov, a Demeter violation, injecting a role, a
  fake, several factory forms.
- Row 9 (max-params): the extract-class stage stops passing the number and deletes the parameter method by method once
  the new class holds it; one step notes JavaScript does not check argument counts.
- Row 10 (class-methods-use-this): methods move from using an argument to using the object's own state; Feature Envy is
  not named (Claude's reading).
- Row 11 (type-hopping-chain): the verse-extraction stage names a Demeter violation and removes it with a class-level
  method.
- Row 12 (switch-on-kind): the most covered row; factory method, case statement in the factory, class-level factory,
  then metaprogrammed, map-based, can-handle, registry and self-registering factories, then back to the simplest.
- Row 15 (new-in-constructor): injection of a role, consolidated object creation, injected bounds with defaults.
- Row 16 (optional-collaborator): the zero case becomes its own subclass; neither pattern name appears.
- Fallow CRAP: the tests stage adds an untested method, an echo-chamber test, then broken code the weak tests let
  through, then reverts (close to coverage in spirit, the oracle's inference).
- File layout: one source file holds every class; two early commits move utility functions to their own file.
- Change coupling: source and test files change together only when a class is created, renamed, exported or deleted,
  never in a behaviour-preserving step. Two revision lines duplicate commits, so a raw coupling count over all refs
  would count pairs twice.

### *99 Bottles* Ruby companion code, commit and tag history (Claude's summary of the oracle report, 2026-11-21; 831 commits, 866 tags)

- No metric or tool named. Same refactoring steps as the JavaScript history; v2.2 (Owen, 2024) rewrites the parameter
  removal run as explicit steps (send to self, temporary default, drop argument, drop parameter).
- Row 11 names the Law of Demeter; row 15 names role injection, required once its default goes; row 12 walks the same
  factory forms. Rows 4, 13, 16, 17 and coverage: nothing.
- File layout: every class in one `lib` file at every stage, all tests in one test file; no class ever moves to its own
  file. No `private` keyword at the seven stages sampled.
- Change coupling: refactoring commits touch one file; only three commits touch source and test together.

## Classes per file and privacy (Claude's summary of four oracle reports, 2026-11-21)

- Classes per file: POODR (six chapters read) and *99 Bottles* (all chapters) are silent; both lay several classes in
  one listing, and *99 Bottles* keeps every class in one file to the end. The talks say it outright: Making is Easy,
  Mending is a Challenge (podcast) and Go Ahead, Make a Mess (2017) put small role-sharing classes in one file so a
  reader sees them together and knows another member is the expected addition; Rails autoload must not dictate design.
- Size: Rules (2013) and the 2014 rules talk set about 100 lines a class, counted per class (code moved into a module
  only that class includes still counts), justified by one screen; Polly Want a Message (2018, 2019) ends with nine
  classes, the largest 18 lines, 134 lines in all; the JavaScript companion's classes run 5-50 lines. No source names
  file length as a metric.
- Privacy: POODR Ch.4 splits public (stable, relied on, tested) from private (changeable, untested); the keyword both
  signals and restricts, the restriction is easy to undo, and comments or a naming convention meet the obligation as
  long as the private side is unmistakable. Callers wanting a private method redesign, add a public method, or isolate
  the dependency in one wrapper. Ch.9: do not test private methods, except scaffolding for messy temporary code. The
  talks repeat this (The Design of Tests; Bike Shed LIVE! 2016; Magic Tricks of Testing 2013) and name reaching into
  another object's private methods Inappropriate Intimacy (Get a Whiff of This, 2016). *99 Bottles* uses no `#`, no
  keyword and no underscore convention; privacy comes from which messages outsiders send. Oracle inference: `#`
  methods cannot be overridden, so `#` on the bottle-number methods would break the polymorphism the book builds.

## Reek candidates (Claude's summary of three oracle reports, 2026-11-21; Lars: "Reek candidates: OK")

| Candidate | Fowler 2e | POODR | Metz talks | Cure |
| --- | --- | --- | --- | --- |
| Feature Envy | named smell, Ch.3; no threshold | concept in Ch.2 and Ch.4, unnamed | named once, Get a Whiff of This (2016), no cure | Extract Function, Move Function; Strategy and Visitor are deliberate exceptions |
| Data Clumps | named smell, Ch.3; test is "would the rest still make sense without one" | Ch.3 argument-order dependency; Ch.2 pair becomes a class | named once, Get a Whiff of This (2016); four-parameter rule hints at a hidden object (2014) | Extract Class, Introduce Parameter Object, Preserve Whole Object |
| Flag argument | Remove Flag Argument, Ch.11: callers pass a literal and the callee branches on it | not found in five chapters | Polly Want a Message (2018, 2019): a branched-on boolean wants an injected role-player; control coupling named an anti-pattern (Go Ahead, Make a Mess, 2013 Q&A) | one named function per value; inject the role-player |
| Repeated conditional | Repeated Switches, Ch.3 (2e narrowed the 1e Switch Statements smell to repetition) | Ch.6 type-code branching breeds checks in callers | Nothing is Something (2015), Polly (2018), Ways to Be Less Clever (2016) | Replace Conditional with Polymorphism, Introduce Special Case, factory |
| Manual dispatch | not covered in the chapters read; Ch.10 uses `instanceof` as a temporary trap | Ch.5: class switches, kind checks and responds-to checks are clues to a hidden duck type; stable core classes and nil tolerated | eight talks 2009-2022; kind checks signal a Liskov violation (SOLID, 2009) | define the duck type; Null Object; factory holds the one choice |

Tools: Reek recommended in Get a Whiff of This (2016); Reek, Flog and Flay named as Code Climate's engines in the NYCrb
panel (2021). RuboCop and SimpleCov appear in no transcript.
