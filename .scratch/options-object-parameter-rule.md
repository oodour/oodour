# Research: an options-object parameter rule

Lars, 2026-11-20: "The lz-oop ESLint plugin should include a parameter rule that properly counts an *options* object
parameter in line with lz-oop/oracle."

## Oracle answers (Claude's summary of four oracle reports, 2026-11-20)

| Entry | What it covers | Coverage |
| --- | --- | --- |
| metz-talks | Rules (Baruco), 2013; An Exploration on the Purpose of Rules, 2014; POODR Book Club (Ruby Rogues #87), 2013: the limit is four parameters, and bundling them into one hash does not get a method under it. In both Rules talks she says three might have been the better number. SOLID Object-Oriented Design (GORUCO), 2009: argument order is a dependency of callers and tests; a hash removes it once order starts to resist, defaults being the usual reason. Get a Whiff of This, 2016: a long list hides an object; Data Clump cured by Extract Class into an object that owns defaults and validation. | 9 of 28 transcripts |
| metz-written | SOLID Design Principles - Dependency Injection, 2009: positional defaults replaced by one options hash so a caller can pass only some. The Wrong Abstraction, 2016: parameters that drive conditionals point to a wrong abstraction. The Shape at the Bottom of All Things, 2014: a selector argument is Primitive Obsession. No count rule, no number. | 16 prose items |
| poodr-2e | Ch.3 (argument order as a dependency; prefer keyword arguments; positional fine for a settled, self-evident list): each keyword is a named dependency of the caller. Ch.6 (options passed whole to a hook method in an inheritance hierarchy): the forwarded collection is the endorsed form. Ch.8 (explicit keywords once composition removes the need to pass options on). No limit, no count rule. | Ch.3, 6, 8 and the index |
| 99-bottles-2e-js | No options object anywhere read; positional parameters with defaults only. Ch.5 (the same argument across methods is a smell; Extract Class, Remove Argument). Ch.9 (arity as part of a role). No limit, no count rule. | Ch.3, 5, 7, 8, 9 |

What no entry says: how to count destructured keys, optional keys, or an object passed whole and read later.

## Claude's design proposal (inference, not a Metz rule)

- Count = positional parameters + keys of each parameter that is destructured in the signature (`{ a, b }`), with
  the rest element counting one. Reason: the talks rule out a hash as a way under the limit, and destructuring names
  every key the function depends on (the keyword reading in POODR Ch.3).
- A parameter that is not destructured counts one, typed or not. Reason: the function depends on one object; a
  parameter object with behaviour is the cure, not a dodge (Get a Whiff of This; POODR Ch.3; 99 Bottles Ch.8). Its
  keys read inside the body (`options.a`) are left to a later, type-aware check, if Lars wants one.
- Default limit 4, strict 3 (the talks' number and her stated regret).
- Message names the smell and the cure: Long Parameter List; cure Introduce Parameter Object / Extract Class (an
  object that owns the defaults and validation), or Preserve Whole Object.
- Optional keys count the same as required ones; softening them is Claude's suggestion only, not taken.

Open for Lars: whether `options.a` reads in the body should count (needs type information or a body scan).

## Lars's ruling and the build plan

Lars, 2026-11-20: "How the parameter rule counts: Detect options reads and destructuring in the body."

Build plan (Claude's, 2026-11-20):

- `max-params` stops wrapping `@typescript-eslint/max-params` and becomes the plugin's own rule, same name and
  `{ max }` option. Lars, 2026-11-20, "1: Option B" (Claude's option b: recommended tier at 4, strict 3 through
  `docs.strictOptions`, matching the talks' four and the stated preference for three).
- Count per parameter, `this` excluded:
  - an identifier, default value or rest element: 1, unless it is an options object (below);
  - an object pattern in the signature: one per key, a rest element 1;
  - an array pattern: one per element.
- An identifier parameter is an options object when the body reads keys from it and sends it no message: member
  reads `p.a` / `p['a']` and destructuring `const { a, b } = p` (or `({ a } = p)`) count each distinct key. A call
  on one of its members (`p.a()`) marks it a collaborator with behaviour, which counts 1 whatever else is read; so
  does passing it on whole (`f(p)`), which only forwards it. This is Claude's reading of the oracle answers (an
  object with behaviour is the cure; the forwarded options collection is endorsed), not a stated rule.
- Nested functions: reads inside a nested function count for the outer parameter (closures still depend on it).
- Message reports the count with its parts: "{{name}} takes {{count}} parameters, {{keys}} of them keys read from
  an options object (at most {{max}})".
- `options-object-keys` (selector rule, signature only, more than four keys) becomes redundant once this lands;
  remove it in the same change with its presets entry and tests.
- Test-first with lz-tdd, one test per cycle; Stryker on the new rule at the checkpoint.
