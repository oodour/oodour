# Stryker runner benchmark, 2026-11-21

Lars asked: "What's the speed difference between the Styrker command runner and the Stryker Node.js test runner, taking
into account the additional mutators?"

## Verdict

The lz-node-test runner with its mutators is faster: a median of 148 s against 346 s per run (2.3 times), and 2.4 s
against 6.5 s per tested mutant (2.8 times). It also tests 19% more mutants: 63 against 53. The ranges do not overlap.
The command side ran as configured, not tuned. Most of its mutants ended as Timeout, so its time is close to a floor
for this setup, not a ceiling (see Limiter).

## Setup

- Scope: `packages/eslint-plugin-lz-oop/src/rules/halstead-volume.ts`, config `stryker.eslint-plugin-lz-oop.config.ts`,
  TypeScript checker, concurrency 8 (4 checker and 4 test runner processes), at commit 05a9edf.
- Side cmd: Stryker's command runner (`node --test` over the package's 29 test files) and Stryker's mutators only,
  `LZ_NODE_TEST_RUNNER` unset.
- Side lz: the lz-node-test runner pinned at `D:/tmp/lz-node-test-pin-aa3bc1b`, `coverageAnalysis: 'perTest'`, with its
  Node.js and numeric-literal mutators.
- Every run without incremental reuse (a fresh `--incrementalFile`), alternated cmd lz lz cmd cmd lz, in one
  heavy-lock slot, 10:05-10:29 local. Machine: 12 cores; peer sessions ran only light work during the slot.
- Script: session scratchpad `bench/slot-bench.sh`; summary `bench/summarize-bench.ts`; per-run JSON reports and logs
  beside them.

## Results (measured)

| Run | Side | Wall | Mutants | CompileError | Killed | Timeout | Survived | Tested | Wall per tested mutant |
|---|---|---|---|---|---|---|---|---|---|
| 1 | cmd | 305.6 s | 80 | 27 | 15 | 38 | 0 | 53 | 5.8 s |
| 2 | lz | 122.0 s | 90 | 27 | 63 | 0 | 0 | 63 | 1.9 s |
| 3 | lz | 148.4 s | 90 | 27 | 63 | 0 | 0 | 63 | 2.4 s |
| 4 | cmd | 346.2 s | 80 | 27 | 10 | 43 | 0 | 53 | 6.5 s |
| 5 | cmd | 361.3 s | 80 | 27 | 8 | 45 | 0 | 53 | 6.8 s |
| 6 | lz | 165.1 s | 90 | 27 | 63 | 0 | 0 | 63 | 2.6 s |

- cmd: median 346.2 s, range 305.6-361.3 s; per tested mutant median 6.5 s.
- lz: median 148.4 s, range 122.0-165.1 s; per tested mutant median 2.4 s.
- Every run exited 0 and scored 100%.
- Both sides slowed across the slot: cmd 306, 346 then 361 s, and lz 122, 148 then 165 s. The alternation spreads
  that drift over both sides.

## The additional mutators

- The lz side's 10 extra mutants are all `LzJsNumericLiteral`, and all 10 were killed. The other 80 mutants are the
  same on both sides, per mutator.
- Its Node.js mutators made no mutant here: halstead-volume.ts calls no Node.js API. A file that does would widen the
  mutant gap.
- So the lz side does 19% more testing work and still finishes in 43% of the time.

## Limiter (inferred, not profiled)

- cmd reruns the whole package suite for every mutant. Stryker sees it as one test: the dry run took 5.9 s.
- lz runs only the tests that cover a mutant: 43 of the 406 tests the dry run counted, on average.
- cmd's default timeout is about 5.9 s x 1.5 + 5 s = 14 s per mutant. 38-45 of its 53 tested mutants hit it. Four
  whole-suite runs at once, each with `node --test`'s own file-level child processes, oversubscribe 12 cores.
- A longer timeout would turn those Timeouts into Killed but would not make cmd faster: a Timeout already cuts a run
  short. With the dry run's 5.9 s per mutant for 53 mutants, cmd needs at least about 310 s if each suite run uses
  the whole machine as the dry run did. That is close to what was measured.
- Not run: a tuned cmd side (lower Stryker concurrency, `--test-concurrency`). Price: one 25-minute slot of 3 runs.
  Lars ruled on 2026-11-20 that Stryker uses lz-node-test, so a tuned cmd figure would change no decision.

## Checklist (pstack benchmark-checklist)

- Limiter: whole-suite reruns per mutant on the cmd side, from the logs and the dry-run counts; no profile.
- Tuned: lz as the repository runs it; cmd on defaults, its Timeouts are a symptom, see Limiter.
- Limits: 53 mutants x 5.9 s = 313 s, against a measured cmd median of 346 s, is consistent.
- Errors: no Survived, NoCoverage or RuntimeError; cmd's Timeouts count as detected, since lz killed the same mutants.
- Repeats: 3 runs per side, alternated (the contract's count; the checklist asks for 5). The gap is far wider than
  either range.
- Relevance: one file. The cmd cost per mutant grows with the whole suite, the lz cost with the covering tests, so the
  gap should widen on a larger scope (inferred).
- Work happened: each JSON report lists every mutant with its status.
