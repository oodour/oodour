# Test code versus application code (2026-11-21)

Lars, 2026-11-21: "Have we analyzed which concepts and cures apply to application/library code vs. test code? What
does the oracle say about this?" Answer: not before today. Today's state: the selector rules skip `testFileGlobs`
(`*.test.*`, `*.spec.*`, `__tests__/**`, `*.d.ts`); every metric rule and every Fallow check applies to tests unchanged.

## What the oracles say (Claude's summary of three reports)

- POODR Ch.9: a test is one more consumer of the class, so the design principles hold for it; the book sets no rule on
  the shape of test code (length, class size, parameters, Demeter). Differences it states: tests may build an abstract
  class or a test-only subclass; role tests keep doubles honest; shared tests move into a shared module only when a
  second case appears; private methods stay untested except as scaffolding for messy temporary code. Painful setup is
  a design signal about the code under test.
- *99 Bottles* Ch.2 and Ch.9: tests hold concrete examples, production holds abstraction; DRY pays much less in tests,
  and the expected value is best written out in full, because removing its duplication takes logic that couples the
  test to the implementation (the echo-chamber tests). A fake may break production rules on purpose (behaviour on the
  static side, a pattern word in its name); a factory test may bundle several assertions; every test keeps one
  arrange-act-assert shape. Ch.8: setup reaching through chains or nested stubs signals Demeter trouble in production
  code. Ch.1: cyclomatic complexity is a floor on the tests full branch coverage needs.
- *xUnit Test Patterns*: test code deserves the same care and refactoring, and must stay simple enough to be read as
  correct. Stricter than production: a test body runs straight through (Conditional Test Logic; cures Guard Assertion,
  Expected Object, Custom Assertion, Parameterized Test); beyond about ten lines a test is too long (Obscure Test,
  Eager Test). DRY applies, but each test's core logic stays visible in the test; logic moves into named test utility
  methods that get their own tests. Hard-coded data and copied production logic both obscure; derived values suit
  most expectations, literals suit a few edge cases. Statically visible smells (oracle's judgement): Conditional Test
  Logic, fixed sleeps (Asynchronous Test), reading the clock (Context Sensitivity), module state shared across tests
  (Interacting Tests), skip and only markers (Lost Test), no assertion (Manual Result Verification), production
  importing test code (Test Logic in Production).

## Proposed treatment per check (Claude's proposal from the reports; not yet ruled on)

| Check | In test files | Ground |
| --- | --- | --- |
| complexity, cognitive-complexity, max-depth | stricter: a test callback takes no branch or loop; test utilities keep the normal limit | Conditional Test Logic; 99 Bottles Ch.2 |
| max-statements | on for each test callback (about 10, Meszaros); off for `describe` bodies | Long Test, Eager Test |
| max-lines-per-function | off: written-out expected values are long by design | 99 Bottles Ch.2 |
| abc-size, flog-score, halstead-volume | off: literal data and assertion calls inflate them; the branch rule above carries the signal | Claude's inference |
| max-class-lines, max-params | on (fakes and test utilities are ordinary code) | POODR Ch.9; Meszaros on parameterized creation methods |
| class-methods-use-this | off: fakes may put behaviour on the static side | 99 Bottles Ch.9 |
| type-hopping-chain | on: a chain in setup points at production coupling; message names the production cure | 99 Bottles Ch.8 |
| switch-on-kind | off; the test-callback branch rule covers it | Conditional Test Logic |
| new-in-constructor, optional-collaborator, optional-private-field | off (stays as today) | tests build and stub collaborators |
| module-let | flips on in tests with an Interacting Tests message | Meszaros |
| Fallow duplication | off for test files, or a high threshold | 99 Bottles Ch.2 |
| Fallow CRAP | production code only | coverage is measured on production code |
| file length | off for test files (RuboCop's `OneClassPerFile` excludes `spec/` and `test/` too) | 99 Bottles keeps one test file |
| change coupling | ignore source-test pairs: they change together by design | both companion histories |

New test-only checks, upstream first: `no-conditional-in-test`, `no-conditional-expect`, `expect-expect`,
`no-focused-tests`, `no-disabled-tests` exist in `@vitest/eslint-plugin` and `eslint-plugin-jest`; lz-oop would turn them
on as optional-plugin rules with lz-oop messages naming Meszaros's smells, and write its own only for the clock and
fixed-sleep cases if no upstream rule covers them.

`testFileGlobs` misses test folders (`test/**`, `tests/**`, `spec/**`, `e2e/**`) that RuboCop and Qlty treat as tests.
