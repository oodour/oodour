# Duplication and abstraction

Use when two or more pieces of code look alike and someone wants to merge them, or when shared code
keeps gaining parameters and branches as its callers diverge.

## Duplication you are tempted to remove

Every extraction hands the reader one more name to learn and one more place to look. Weigh that
against the edits it will save; an extraction with no edits ahead of it is pure cost (Ch.1).

1. Ask what would trigger the merge. A new requirement that the copies block is a reason (Ch.3); this
   plugin reads that as a change request that would touch every copy. Enough clear examples to show
   what really varies is another (Ch.2). Code that merely looks repetitive is not.
2. Ask what waiting costs, and when better information will arrive. If the copies can sit unchanged
   until then, wait (Ch.2).
3. Look for the concept, not the matching characters. One line that means the same thing in both
   places (a date format, a rounding rule) can be extracted now and named for what it means, one
   level above how it is done (Ch.1 and Ch.3). This plugin adds a test: two lines that happen to match
   but would change for different reasons are not one concept.
4. Say why the wait is worth it: an abstraction drawn from too few examples tends to be the wrong
   one, and code built on the wrong abstraction costs more to change than the duplication it
   replaced (Ch.1; the article The Wrong Abstraction, 2016).

## Shared code that callers keep bending

The usual history: code is extracted and shared; a new caller needs something slightly different
and adds a parameter and a branch; the next caller adds another. Shared code that already exists looks
deliberate, so newcomers extend it instead of questioning it, and every extension makes removing it
look more costly. What remains is one function doing several jobs, picked by flags (The Wrong
Abstraction, 2016).

1. Recognise it: parameters that only some callers pass, branches that only some callers reach.
2. Say that the abstraction may be wrong, and that the time already spent on it is no reason to
   keep it.
3. Undo it: inline the shared code at every call site, so each caller holds its own copy; trim each
   copy to the branches its caller takes; then compare the trimmed copies and extract only what they
   still share (The Wrong Abstraction, 2016). This plugin adds three things the article does not say:
   a copy may go into a function or object per purpose instead of into the caller, the work goes in
   small steps that keep every caller's output the same, and the tests run after each step.
4. Often what each caller actually needs is a collaborator that knows its own part: see Flag
   arguments in [variants-and-conditionals.md](variants-and-conditionals.md).

## Making similar code identical, step by step

Use the Flocking Rules (Ch.3) when copies have to become one, and also when you suspect an
abstraction but cannot see it yet: the book does not ask you to know the abstraction first, because
following the rules makes it appear (Ch.3, Ch.4).

1. Choose the pair of passages that resemble each other most closely.
2. Locate the tiniest point where they still differ.
3. Remove only that point, with the least edit you can, in four moves, with the tests run after
   each: add the new code so it parses, run it, use its result, then delete what it replaced (Ch.3).
4. Keep each edit to about a line, and undo any edit that turns the tests red.
5. Repeat from step 1 until the copies are identical, then let one replace the rest.

Give each difference you remove a name one level above the concrete values it hides (Ch.3 and
Ch.4); see Naming below. Done looks like: the copies are identical, the suite has stayed green
throughout, and the name of each removed difference reads as a domain concept.

Example (the plugin's own, in TypeScript). Two branches differ only in a word and a rate:

```ts
// before
if (tier === 'gold') {
  return `Gold members earn ${points * 2} points`;
}
return `Silver members earn ${points * 1} points`;

// after one difference is named (the multiplier), then the next (the label)
return `${labelFor(tier)} members earn ${points * multiplierFor(tier)} points`;
```

The rate was the smallest difference, so it went first, as `multiplierFor`; the branches then
differed only in the label, which became `labelFor`.

## Separating what varies

- When the branches of a conditional are mostly the same, move only the part that differs into the
  condition, and leave the rest as a template that serves every case (Ch.2).
- When two examples of one idea differ, give the differing part a name. That part is a concept of
  its own, nested in the larger one, and finding it is why you compare the examples. Look for it on
  purpose, because what matches catches the eye first (Ch.3).

## Once an abstraction exists, use it everywhere

An abstraction does two jobs: it puts code in one place under a name, and it shows every place that
depends on the idea. The second job works only if every place the idea applies goes through it. Code
that keeps passing a value computed by hand can pass its tests by luck, for example when a wrong
value happens to fall through to a default branch (Ch.4). When you introduce a concept, search for
every sender that should use it, and convert each one.

## Naming

Use these when a new class, method or argument needs a name, most often for a difference the
Flocking Rules just removed.

1. Lay the concrete examples out as rows of a table and ask what the column heading should be (Ch.3,
   Ch.4). Picture other members of the same category to test the heading.
2. Aim one step more abstract than the examples, in the words the customer uses. Reject a name many
   steps more abstract, or one that is not a domain word (Ch.3).
3. Name a method for what it means, not for how it happens to work today (Ch.1, Ch.5). A class can
   be named for what it is; a more abstract class name is speculation (Ch.5).
4. Keep design-pattern names out of production class names: such a name feels like naming but
   says nothing about the domain. Test-only code is the exception, where a fake's name may be the
   clearest (Ch.9).
5. When no good name comes, choose one of three moves: search for a short, fixed time and take the
   best so far; use a deliberately meaningless placeholder that is sure to be replaced; or ask the
   teammate who names things best. Name from the responsibility as you understand it now, and rename
   when that changes (Ch.4).

Done looks like: the name fits every row of the table and the next one you can imagine, and a domain
expert would recognise it.

Example (the plugin's own): rows `'gold' -> 2`, `'silver' -> 1`, `'bronze' -> 0.5`. The heading is
not `value` (too abstract, not a domain word) and not `goldOrSilverRate` (not abstract at all);
`multiplier` names the column one step up.
