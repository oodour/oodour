# data-clumps performance, 2026-11-21

Lars: "data-clumps speed: Benchmark it and optimize its performance."

## Verdict

Large scopes are much faster, and the reports are unchanged. Real code pays a few microseconds more per file.

| Shape | Old (median of 3) | New (median of 3) | Speedup |
|---|---|---|---|
| 1,600 functions, same 10 parameters (92 KB) | 1,484 ms | 8.0 ms | 186x |
| 3,200 functions, same 10 parameters (184 KB) | 6,176 ms | 11.0 ms | 560x |
| 150 functions, every pair shares 2 own names (384 KB) | 5,898 ms | 124 ms | 48x |
| 3,000 functions plus 750 methods from a 40-name pool (113 KB) | 3,251 ms | 1,070 ms | 3.0x |
| Probe corpus, 3,758 real files over 10 roots (median of 5) | 80.5 ms | 99.2 ms | 0.81x |

Times are the rule's own listener time (wrapped, as ESLint's TIMING measures it), without parsing. The sides ran
alternated (old, new) in 3 rounds for the shapes and 5 for the corpus. Other sessions loaded the machine during the
final rounds: the old 3,200-function run read 3.9 s at the quiet baseline and 6.1-6.7 s in the final rounds. The
ratios hold inside each round.

## What was slow (the hypothesis that held)

The old search intersected every pair of parameter lists in a scope, identical or disjoint, with `includes` on
arrays: n^2 / 2 intersections of p^2 steps each. Then it checked every pair's names against every list, and
`reportClumps` scanned every function again for each clump.

The new search:

- groups functions with the same names, so identical lists meet once;
- indexes names to the lists that hold them, so only lists that share a name meet;
- uses Sets for membership;
- returns each clump with its functions in source order, so reporting needs no rescan.

The random-pool shape stays quadratic in the number of functions when the name pool is fixed: every list meets every
other list that shares a name (inferred from the profile, where appending index entries leads at 19% of self time).
Real scopes draw on a growing vocabulary, which keeps that small.

## Real code

The rule costs about 0.02-0.03 ms per file either way. A full lint of the corpus takes about 15.7 s, so data-clumps
is under 1% of it before and after. The new version's fixed cost per scope (grouping, Sets, the index) adds about
19 ms over 3,758 files. A guard that skips scopes under three functions recovered none of it (3 rounds: 91-99 ms
against 62-80 ms) and was removed. The profiler could not attribute the rest: the rule's frames are under 0.5% of the
samples.

## Correctness

- Differential loop: old and new rule through ESLint's Linter on random scopes. 7,500 cases over 6 seeds, 13,000+
  reports, 0 differences in the set of reports (line, column, message).
- The order of two reports on the same function can differ from the old order. ESLint sorts reports by position, and
  no test or consumer depends on the order within one position.
- Corpus and every synthetic shape: identical digests of the reports.
- The rule's 16 tests and the package's 409 pass.

## Regression test

No cheap stable seam for a timing test was found. At the real call site (ESLint's Linter with parsing), the growth
ratio of 3,200 against 800 functions read 3.96-4.14 for the new rule but only 7.6 for the old. Parsing dilutes the
quadratic part, so a ratio test would have less than 2 times margin and take about 40 s per run. The differential
loop and this record stand in for it.

## How to rerun

Harness, kept out of git under `dist/dc-bench/`: `bench.ts`, with the old rule copied from the parent of the data-clumps
performance commit (`git show <commit>^:packages/eslint-plugin-lz-oop/src/rules/data-clumps.ts`, with its
`create-rule.ts` import pointed at the package).

- `node dist/dc-bench/bench.ts <old|new> same|pairs|random|corpus ...`
- `node dist/dc-bench/bench.ts diff <cases> <seed>`

Node.js 24.22.0, ESLint 10.13.0, 12 cores.
