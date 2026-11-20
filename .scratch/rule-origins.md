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
