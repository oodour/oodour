# The size limits are set in what ESLint counts, not copied from Sandi Metz's numbers

The plugin's Size limits entry (`plugins/lz-oop/references/smells.md`) gives Sandi Metz's numbers: a method of at most
5 lines, a class of at most 100, at most 4 parameters. `@layzee/eslint-plugin-lz-oop` defaults to 7, 110 and 3 instead,
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

## Considered Options

- **The numbers as stated: 5 lines, 100 lines, 4 parameters.** For lines, a limit of 5 in ESLint's counting would allow
  a body of only 3 lines. For classes, 100 would hold JavaScript classes to a shorter length than the Ruby ones the rule
  was made for. For parameters, Lars chose the lower number she has said may fit better.
