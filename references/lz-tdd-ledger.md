# lz-tdd ledger

Issues and findings about the `lz-tdd` plugin (`lz-red`, `lz-tpp`, `lz-refactor`), observed while it drives
test-first work in this repository. Lars, 2026-11-15: "Keep an lz-tdd ledger with issues and findings observed".
Add an entry when it happens; Lars decides what goes to lz-tdd's own repository
(`D:\projects\github\LayZeeDK\lz-engineering-claude-plugins`), and nothing is filed there without his yes.

Entry shape: date, what was seen, where (file and line in lz-tdd 0.0.3 unless noted), how it was seen (measured by
whom, or inferred), and its effect on an agent using the plugin.

## Open

2. **2026-11-15. The copy check is narrow.** The no-verbatim gate flags only double-quoted runs over 120 characters;
   close paraphrase in the Fowler and GoF leaves has not been measured, unlike this repository's
   `tools/source-overlap.ts`. Seen by the same reviewer (measured for the gate, inferred for the gap).
3. **2026-11-15. Seven catalog leaves are unreachable from the smell route.** Encapsulate Collection, Parameterize
   Function, Return Modified Value, Functor and Monad, Lens and Optics, Normalized Store and Transducers are linked only
   from their catalog README, so an agent coaching from `smells.md` never reaches them. Seen by the same reviewer with a
   link-graph script (measured).
4. **2026-11-15. Heavy routing text.** `lz-refactor` SKILL.md is about 2,700 words and inlines a whole loop audit; a
   coach run on a structural smell reads about 5,500 to 11,000 words. The red/green/refactor classifier is restated
   about seven times across the three SKILL.md files and `beck-tdd-by-example.md`. The functional catalog README is
   3,600 words. Seen by the same reviewer (measured sizes, inferred load).
5. **2026-11-15. The records disagree on GoF.** `.planning/PROJECT.md` line 89 lists GoF as a book not in the store,
   while line 214 says the GoF catalog was verified through the clean room. Seen by the same reviewer (measured).
6. **2026-11-15. The Fowler catalog has no Sources section**, and no catalog leaf has its own; citation is per catalog
   README only. Seen by the same reviewer (measured).

The full review: the session scratchpad's `hierarchy-lztdd.md` (not committed; its findings are copied above).

## Closed

1. **2026-11-15. The Kerievsky index's Direction column looked inverted; it is not.** A hierarchy reviewer agent
   read "Away | Builder" and "Away | Visitor" as pointing away from the pattern each refactoring builds. Lars,
   2026-11-15: "There was a lot of confusion about the Kerievsky index's Direction column but it should be correct in
   the v0.0.3 branch's latest commit." Checked by Claude: the branch `gsd/lz-tdd-0.0.3-lz-red` at `1fae18c` holds
   the same file as the installed 0.0.3. Commit `4da6a89` records both rows as an owner-approved de-patterning
   framing: each refactoring builds the named pattern and retreats from another (Composite, Iterator). It also dropped
   the legend's gloss that `Away` means retreating from the named pattern, which was the source of the misreading.
