---
name: lz-oop
description: Object-oriented design coach for JavaScript and TypeScript, based on Sandi Metz's principles and practices. Use when a developer is about to write or change classes, objects or modules and asks how to shape them; when a new requirement lands on existing object-oriented code and they ask where it should go; when they ask for a design review of existing code (dependencies, responsibilities, conditionals that pick behaviour, inheritance versus composition, duplication, naming); or when they ask what a design principle, smell or pattern means for their code. Not for choosing the next failing test or making a failing test pass, and not for code in other languages.
---

# lz-oop: object-oriented design coach

Version 0.0.0 is a scaffold. Its procedures and references are written from evaluation gaps, one
release at a time.

## Classify the request first

1. **Shape**: code that is about to be written, or existing code that must change for a new
   requirement.
2. **Review**: the design of code that exists, with no change requested yet.
3. **Explain**: what a principle, smell or pattern means, for this code or in general.
4. **Not a design question**: a bug, a rename, a request to write or pass a test, functional code
   where objects would not help, or another language. Answer it directly without this skill's
   procedures.

Inspect the project before advising: its language and module style, framework conventions, and how
its existing code and tests are written. Advice must fit the codebase, including codebases where
classes are not the house style.

Advise on a question; change code only on an explicit request to do so, then stop.
