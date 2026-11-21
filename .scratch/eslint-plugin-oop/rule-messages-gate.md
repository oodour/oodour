# Rule messages to gate, 2026-11-21

Gated the same day by oracle-reviewer on Fowler 2e, POODR, *99 Bottles* (JS) and Martin (2000). repeated-switches
passed. The others were revised, and the shipped text now reads:

- flag-argument: "... Cure: Remove Flag Argument, a named function for each value; or, when each value stands for a
  kind of behaviour, pass in an object of that kind and send it a message." Fowler's refactoring ends in named
  functions, so the injected object is a separate alternative (POODR, *99 Bottles*). The rule now skips a factory, a
  function whose every `return` creates an object (*99 Bottles*: the choice of class belongs in a factory).
- manual-dispatch: "Look for what this code needs from every object it tests." (POODR: ask what the sender needs from
  all of them, not what each class already offers). "Manual Dispatch" is the plugin's own label; no entry names it.
- new-in-constructor: Dependency Inversion confirmed (Martin, *99 Bottles*). Cure: "... keep this class as a default
  only while existing callers still need it, and let a factory be the one place that creates it when it varies."
  (Martin: a default keeps the concrete reference; *99 Bottles*: such a default is temporary).

The texts as first drafted follow.

Four rules of `eslint-plugin-lz-oop`, the ESLint plugin that ships with lz-oop. Each reports code and prints the
message below. The message names a concept (a smell or principle), what to look for, and a cure. The plugin's own
JavaScript and TypeScript choices must stay within the principles, patterns and practices of Sandi Metz and Katrina
Owen. Check each concept name, each claim about what the code shows, and each cure.

## flag-argument (recommended tier)

Reports a parameter the function body branches on (an `if`, ternary, loop test or `switch` discriminant) when the
parameter can only hold a few constants: typed `boolean` or a union of literals, a boolean or string default, or a call
in the same file passes it a literal.

> Stop and look: Flag Argument, the function 'render' branches on its parameter 'compact'. Look for callers that pass a
> constant to choose a path. Cure: Remove Flag Argument, a named function for each value, or inject the object that
> plays the role.

## repeated-switches (recommended tier)

Reports every `switch` in a file whose case labels match those of another `switch` in that file.

> Stop and look: Repeated Switches, this file has 2 switches on the cases 0, 1. Look for the same choice in other
> files. Cure: Replace Conditional with Polymorphism, an object per case chosen once by a factory, so each switch
> becomes a message to that object.

## manual-dispatch (strict tier)

Reports an `if`/`else if` chain that tests one object with `instanceof` against two or more of the program's own
classes (error classes and built-in value classes do not count).

> Stop and look: Manual Dispatch, this chain tests which class 'shape' is to decide what to do. Look for the message
> each branch would send instead. Cure: define the duck type, one message every one of these classes answers, so the
> code sends it without asking.

## new-in-constructor (strict tier)

Reports a `new` in an instance method body or a field initializer, except a factory (a static method, a `new` that is
returned directly, an arrow that returns one), a thrown error, a built-in value class, and a parameter default.

> Stop and look: Dependency Inversion, this class creates its own collaborator, so it depends on one concrete class
> instead of the role it needs. Look for the class it names. Cure: Dependency Injection, the collaborator as a
> constructor or method parameter, with this one as its default if most callers want it.
