# The size limits are set in what ESLint counts, not copied from Sandi Metz's numbers

The plugin's Size limits entry (`plugins/oodour/references/smells.md`) gives Sandi Metz's numbers: a method of at most
5 lines, a class of at most 100, at most 4 parameters. `@oodour/eslint-plugin` defaults to 7, 110 and 3 instead,
because each lint rule counts differently from the way those numbers are stated, or because she has said a lower
number may fit better. Do not "align" the lint defaults with the reference; the difference is deliberate.

## The three limits

- **7 lines per function** (`max-lines-per-function`, blank lines and comments skipped). ESLint counts the line that
  opens the function and the line with its closing brace, so 7 allows a body of 5 lines: the rule's tests pass a 5-line
  body and report a 6-line one. Lars, 2026-11-18: "Keep the 7-line limit".
- **110 lines per class** (`max-class-lines`, blank lines and comments skipped, from the `class` line to the closing
  brace). The JavaScript classes of the *99 Bottles of OOP* companion code measured 1.06 to 1.09 times as long as the
  same classes in Ruby, the language the 100-line rule was made in. Lars, 2026-11-18: "max-class-lines defaults: OK but
  with `max: 110` to match the ~1.10 factor between Ruby and JavaScript/TypeScript classes".
- **3 parameters** (`max-params`). In the talks Rules (2013) and An Exploration on the Purpose of Rules (2014), she
  says she has long had doubts about 4 and that 3 may be the better number: with four parameters an object is almost
  certainly hiding in the list. Lars, 2026-11-18, on that report: "We set it to 3 then."

## Update, 2026-11-20: parameters counted as dependencies, 4 by default and 3 in strict

`max-params` is now the plugin's own rule, not a wrapper. It counts each key of an object pattern, each element of an
array pattern, and each distinct key the body reads from a parameter it only reads data from (a parameter the body
sends a message to or passes on whole counts as one). Body reads count only for a parameter with no type or an inline
object type; a parameter of a named type counts as one, and a function passed straight to a call as a callback is not
checked (Claude's decision, 2026-11-20: a named parameter type is the cure Introduce Parameter Object, so it counts as
one; an anonymous object is the options dodge). Lars, 2026-11-20: "How the parameter rule counts: Detect options
reads and destructuring in the body." With options keys counted, the rule's default is 4 and the strict presets set
3. Lars, 2026-11-20, "1: Option B" (recommended tier at 4, strict 3). The recommended presets now turn the rule on;
before, only the strict ones did, at 3. The 3 in the opening paragraph, in the parameter item above and under
Considered Options describes the rule before this update; 3 is now the strict presets' limit.

## Considered Options

- **The numbers as stated: 5 lines, 100 lines, 4 parameters.** For lines, a limit of 5 in ESLint's counting would allow
  a body of only 3 lines. For classes, 100 would hold JavaScript classes to a shorter length than the Ruby ones the rule
  was made for. For parameters, Lars chose the lower number she has said may fit better.
