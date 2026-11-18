# eslint-plugin-oop todo (poteto Feature playbook under lars-mode)

- [ ] 1. `how` over the affected subsystem.
- [ ] 2. `architect` for parallel design exploration.
- [ ] 3. Write the throughput checkpoint as four todo items.
  - [ ] Blocking first steps: wave 1 scaffold (package, project.json, devDeps, test harness, presets) before any rule.
  - [ ] Independent workstreams: each custom rule is its own file pair after the scaffold; at most 2 rule workers at
        once (4-agent cap, plus review agents).
  - [ ] Shared mutable state: `src/index.ts` rule registry and presets; workers do not touch it, Claude registers
        each rule when merging.
  - [ ] Smallest safe decomposition: one worker per wave, each in its own worktree branch off HEAD.
- [ ] 4. Delegate code-writing to a subagent (feature model) with a specific scope ... Give every file-writing
      delegate its own worktree.
- [ ] 5. Verify on the matching surface. (RuleTester specs + `nx run eslint-plugin-oop:lint` against a fixture and
      one audited repo, read-only.)
- [ ] 6. Rebase into small, ordered commits. Stack follow-ups.
- [ ] 7. If the design is contested, `interrogate` before shipping.
- [ ] 8. Run **Opening a PR**. skip: lars-principle-human-only-gates (no PR or push without Lars's yes).

## Then
- [ ] Fallow spike on lz-gardener (read-only), then lz-oop Fallow preset(s).
- [ ] lz-gardener full-cure round (finding 3 commit after tests, then f5, f1, f4, f6).
  - f3 tests: 10 files passed (log*, store-git*, census*, site-bed 1900 s). Paused 2026-11-18 at lz-gardener-19's
    request. The remaining files, store-census*, store, store-sync, cli*, site and weeds*, are heavy work: book them
    in heavy-lock parts of at most 30 min each.
- [ ] Fold core.md "Configurable rules" into the lint audit file. (done when checked)
