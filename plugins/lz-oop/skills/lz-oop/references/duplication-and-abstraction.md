# Duplication and abstraction

Use when two or more pieces of code look alike and someone wants to merge them, or when shared code
keeps gaining parameters and branches as its callers diverge.

## Duplication you are tempted to remove

Every extraction hands the reader one more name to learn and one more place to look. Weigh that
against the edits it will save; an extraction with no edits ahead of it is pure cost (Ch.1).

1. Ask what would trigger the merge. A change request that touches every copy is a reason (Ch.3), and
   so are enough clear examples to show what really varies (Ch.2). Code that merely looks repetitive
   is not.
2. Ask what waiting costs, and when better information will arrive. If the copies can sit unchanged
   until then, wait (Ch.2).
3. Look for the concept, not the matching characters. One line that means the same thing in both
   places (a date format, a rounding rule) can be extracted now and named for what it means, one
   level above how it is done (Ch.1 and Ch.3). This skill adds a test: two lines that happen to match
   but would change for different reasons are not one concept.
4. Say why the wait is worth it: an abstraction drawn from too few examples tends to be the wrong
   one, and code built on the wrong abstraction costs more to change than the duplication it
   replaced (Ch.1; the article The Wrong Abstraction, 2016).

## Shared code that callers keep bending

The usual history: code is extracted and shared; a new caller needs something slightly different
and adds a parameter and a branch; the next caller adds another. Each developer feels bound to keep
the abstraction that is already there, and the more has gone into it the harder it is to let go, so
the shared code ends up as several jobs selected by flags (The Wrong Abstraction, 2016).

1. Recognise it: parameters that only some callers pass, branches that only some callers reach.
2. Say that the abstraction may be wrong, and that the time already spent on it is no reason to
   keep it.
3. Undo it: put a copy of the shared code back into each caller; in each copy, delete the branches
   that caller never takes; then look across the copies again for what is truly shared, and extract
   only that (The Wrong Abstraction, 2016). This skill adds three things the article does not say:
   a copy may go into a function or object per purpose instead of into the caller, the work goes in
   small steps that keep every caller's output the same, and the tests run after each step.
4. Often what each caller actually needs is a collaborator that knows its own part: see Flag
   arguments in [variants-and-conditionals.md](variants-and-conditionals.md).

## Making similar code identical, step by step

When copies have to become one, use the Flocking Rules (Ch.3). Their purpose is convergence: keep
nudging the closest copies toward each other in edits so small that each can be checked by the
tests and undone at once, until the copies are identical and one can replace the rest. Give each
difference you remove a name one level above the concrete values it hides (Ch.3 and Ch.4).
