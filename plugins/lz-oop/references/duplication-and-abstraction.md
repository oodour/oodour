# Duplication and abstraction

Use when two or more pieces of code look alike and someone wants to merge them, or when shared code keeps gaining
parameters and branches as its callers diverge.

Contents: Duplication you are tempted to remove; Shared code that callers keep bending; Making similar code identical,
step by step; Separating what varies; Once an abstraction exists, use it everywhere; Naming.

## Duplication you are tempted to remove

Every extraction hands the reader one more name to learn and one more place to look. Weigh that against the edits it
will save; an extraction with no edits ahead of it that does not make the code easier to read is pure cost, while a name
for a concept the code hides pays for itself in reading.

1. Ask what would trigger the merge. A new requirement that the copies block is a reason: a change request that would
   touch every copy. Enough clear examples to show what really varies is another. Code that merely looks repetitive is
   not.
2. Ask what waiting costs, and when better information will arrive. If the copies can sit unchanged until then, wait.
   While you wait, mark every copy you keep with the same short comment carrying a shared number, so that when the
   change arrives each copy can be found and none is missed.
3. Look for the concept, not the matching characters. Abstract early only when many clear examples give confidence that
   the concept is understood; an idea that looks obvious from two examples can turn out wrong. A single line that means
   the same thing in both places (a date format, a rounding rule) may be extracted now only when three things hold: the
   concept is unambiguous in the domain's words, extracting makes both places easier to read, and waiting would cost
   something. Otherwise wait for a change request or more examples. Name it one level above the thing it names, in the
   domain's words. Two lines that happen to match but would change for different reasons are not one concept.
4. Say why the wait is worth it: an abstraction drawn from too few examples tends to be the wrong one, and code built on
   the wrong abstraction costs more to change than the duplication it replaced.

## Shared code that callers keep bending

The usual history: code is extracted and shared; a new caller needs something slightly different and adds a parameter
and a branch; the next caller adds another. Shared code that already exists looks deliberate, so newcomers extend it
instead of questioning it, and every extension makes removing it look more costly. What remains is one function doing
several jobs, picked by flags.

1. Recognise it: parameters that only some callers pass, branches that only some callers reach.
2. Say that the abstraction is wrong and should be undone, and that the time already spent on it is no reason to keep
   it.
3. Undo it: inline the shared code at every call site, so each caller holds its own copy; trim each copy to the branches
   its caller takes; then compare the trimmed copies and extract only what they still share. A copy may go into a
   function or object of its own instead of into the caller, provided it serves one caller's purpose and takes no
   parameter that selects behaviour; the work goes in small steps that keep every caller's output the same; and the
   tests run after each step. Merge such homes only after the comparison shows what the copies really share.
4. Often what each caller actually needs is a collaborator that knows its own part: see Flag arguments in
   [variants-and-conditionals.md](variants-and-conditionals.md).

## Making similar code identical, step by step

Use the Flocking Rules when copies have to become one, and also when you suspect an abstraction but cannot see it yet:
you need not know the abstraction first, because following the rules makes it appear.

1. Choose the pair of passages that resemble each other most closely.
2. Locate the tiniest point where they still differ.
3. Remove only that point, with the least edit you can, in four moves, with the tests run after each: add the new code
   so it parses, run it, use its result, then delete what it replaced.
4. Keep each edit to about a line; treat that size as a guide, not a hard limit. Two lines need not match after one
   edit: moving them a little closer with methods that already exist counts.

   When the shared expression calls a method whose own branches return values of different types, make every branch of
   that method return one type, as a pass of its own: a sender should be able to trust the kind of value a message
   returns. You may also reach that point while flocking, with a conversion where the result is used that you drop once
   the method returns one type.

5. Undo any edit that turns the tests red, at once, instead of fixing forward, and try a better move. When the move that
   failed was a big one, make the next one smaller. Let the size of each move follow how well you know the code: a
   bigger step that fails tells you that you knew less than you thought. The rules promise a safe way back, not the
   right direction. Duplication squeezed out too eagerly, merging pieces that only looked alike, can leave you stuck;
   then put the duplication back and look again. That retreat is open at any point of the Flocking Rules.
6. Repeat from step 1. A copy is removed only once it matches another character for character.
7. A branch that has come to match the default branch goes in one deletion, and the conditional stays for the branches
   that still differ. When the last branches match, collapse the conditional in two edits with the tests run after each:
   put one copy above the conditional, then delete the conditional.

Copies in two separate functions follow the same rules. Make the bodies identical first: each function reaches its
varying parts through calls of the same name, or through one object of parts. Then merge in edits of their own, with the
tests after each and any edit that turns them red undone:

1. Extract a shared function from the first copy, taking the varying parts as a parameter.
2. Make the first function call it with its parts.
3. Make the second function call it with its own parts.
4. Only if callers should see one function, move them over one at a time (Gradual Cutover in
   [changing-in-steps.md](changing-in-steps.md)), then delete the old functions.

Writing the shared function and switching both copies to it in one edit skips these steps, so a red test no longer
points at one change.

Give each difference you remove a name one level above the concrete values it hides; see Naming below. Done looks like:
the copies became identical before any was deleted, the suite ran after every edit and every edit that turned it red was
undone, and the name of each removed difference reads as a domain concept. When you advise someone else, give them these
working rules too: run the tests after every edit, and undo an edit that turns them red.

Example in TypeScript. Two branches differ only in a word and a rate; each state below is green:

```ts
// 1. before
if (tier === 'gold') {
  return `Gold members earn ${points * 2} points`;
}
return `Silver members earn ${points * 1} points`;

// 2. the rate is the smallest difference: both branches now ask multiplierFor
if (tier === 'gold') {
  return `Gold members earn ${points * multiplierFor(tier)} points`;
}
return `Silver members earn ${points * multiplierFor(tier)} points`;

// 3. then the label: the two branches are now identical
if (tier === 'gold') {
  return `${labelFor(tier)} members earn ${points * multiplierFor(tier)} points`;
}
return `${labelFor(tier)} members earn ${points * multiplierFor(tier)} points`;

// 4. one copy above the conditional, run the tests, then delete the conditional and the other copy
return `${labelFor(tier)} members earn ${points * multiplierFor(tier)} points`;
```

## Separating what varies

- When the branches of a conditional are mostly the same, move only the part that differs into the condition, and leave
  the rest as a template that serves every case.
- When two examples of one idea differ, give the differing part a name. That part is a concept of its own, nested in the
  larger one, and finding it is why you compare the examples. Look for it on purpose, because what matches catches the
  eye first.
- Before naming anything, put a placeholder in each copy wherever the copies' values differ, so they read as one
  template with gaps; the gaps show what varies, and naming them comes after.

## Once an abstraction exists, use it everywhere

An abstraction does two jobs: it puts code in one place under a name, and it shows every place that depends on the idea.
The second job works only if every place the idea applies goes through it. Code that keeps passing a value computed by
hand can pass its tests by luck, for example when a wrong value happens to fall through to a default branch. When you
introduce a concept, search for every sender that should use it, and convert each one.

## Naming

Use these when a new class, method or argument needs a name, most often for a difference the Flocking Rules just
removed.

1. Lay the concrete examples out as rows of a table and ask what the column heading should be. Picture other members of
   the same category to test the heading.
2. Aim one step more abstract than the examples, in the words the customer uses. Reject a name many steps more abstract,
   or one that is not a domain word.
3. Name a method for what it means, not for how it happens to work today. A class can be named for what it is; a more
   abstract class name is speculation.
4. Keep design-pattern names out of production class names: such a name feels like naming but says nothing about the
   domain. Test-only code is the exception, where a fake's name may be the clearest.
5. When no good name comes, choose one of three moves: search for a short, fixed time and take the best so far; use a
   deliberately meaningless placeholder that is sure to be replaced; or ask the teammate who names things best. Name
   from the responsibility as you understand it now, and rename when that changes.
6. Name from the domain, not from how the code works or how it is laid out: of the three, only domain names help. Keep
   the names of one class at one level of abstraction, told from one consistent point of view.

Done looks like: the name fits every row of the table and the next one you can imagine, and a domain expert would
recognise it.

Example: rows `'gold' -> 2`, `'silver' -> 1`, `'bronze' -> 0.5`. The heading is not `value` (too abstract, not a domain
word) and not `goldOrSilverRate` (not abstract at all); `multiplier` names the column one step up.
