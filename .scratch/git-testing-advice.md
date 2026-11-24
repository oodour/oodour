# Testing Git-dependent code: advice from lz-gardening (2026-11-24)

Lars asked (2026-11-24 02:00 local): "Analyze lz-gardening and ask its session for advice for testing Git-dependentant
code/tests - abstraction layers, test/production performance optimizations, cross-OS support, and so on."

Source: the lz-gardening session's answer (2026-11-24), about `D:/projects/github/LayZeeDK/lz-gardener`, scripts in
`plugins/lz-gardening/skills/lz-garden/scripts`. [m] measured by that session, [i] inferred.

## What lz-gardening does

1. **No fake Git.** Every Git-touching test runs real Git. Its ADR 0007 rejected an in-memory fake repository: it
   speeds up tests, not the scripts, and drifts from Git where it matters (ref compare-and-set) [i]. The seams it has:
   - one Git layer that every module calls and that adds the `-c` overrides itself;
   - two read strategies behind it (spawn per read, or one long-lived `cat-file --batch-command` reader), picked by an
     internal environment variable, held to the same answers by a contract test;
   - pure parsers kept apart and tested without Git;
   - OS behaviour passed as a parameter (`renameRetrying({ rename, platform })`), so the Windows EPERM retry is tested on
     Linux too.
   - It counts Git starts instead of faking Git: a Proxy around `spawnSync` plus a diagnostics channel for the worker; a
     test pins the command order and the count per command. Counting in a child process killed no Stryker mutants;
     spying in-process did [m].
2. **Test speed [m].** One `git init` per test process, copied per test; a fixture commit reads HEAD from the files it
   wrote instead of `rev-parse`; bare remote and origin written by copying. A spike first checked the copies match real
   init/push/fetch (files, config, refs, fsck, status). Git starts per file dropped by about a third to a half; the suite
   went from 1472 s to 1217 s (912 tests, one run each side, shared Windows machine). No shared read-only fixtures: each
   test builds its own state.
3. **Production speed [m].** A Git start costs 40-100 ms on Windows and about 2 ms on Linux. On Windows: one
   `cat-file --batch-command` per folder for the whole run, kept synchronous with a worker thread and `Atomics.wait`; on
   Linux one Git per read is cheaper. Also `cat-file --batch-check` for ids and `ls-tree -r -z`. Gotchas: Windows will
   not rename a folder a reader uses as its working folder; a same-size `pack-refs` can leave a reader's packed-refs
   stale.
4. **Cross-OS [m].** `GIT_EDITOR` and `GIT_OPTIONAL_LOCKS` from Claude Code added a Git start, so start-count pins passed
   only under Claude Code. Windows needed the EPERM rename retry, an explicit kill of a Git a timed-out fetch leaves,
   and slash path forms; absolute-path assumptions failed on Linux. Test hooks are `#!/bin/sh`, which Git runs on
   Windows too. CI: ubuntu-latest and windows-latest on Node 22.18.0 and 24; Linux mutation runs in an arm64 container.
   No macOS runner; nothing pins CRLF or autocrlf.
5. **Git versions.** No version gates and no test skips; the README requires Git 2.55 or later (the oldest Git on
   GitHub's hosted runners for all three OSes). A 2.39 container is below what it would support.
6. **Isolation [m].** Delete every inherited `GIT_` variable except `GIT_CONFIG_*`; `GIT_CONFIG_GLOBAL` points at a test
   config (only `maintenance.auto=false`); `GIT_CONFIG_NOSYSTEM=1`. Each fixture commit sets its own author and committer.
   HOME, `init.templateDir` and `safe.directory` are not set, and nothing has needed them [i].

## Compared with lz-oop's `plugins/lz-oop/scripts/fixtures.ts`

Claude's reading, to be checked against `fixtures.ts` before any change:

- Same stance on fakes: lz-oop runs real Git in temporary folders, and its untrusted path is tested against Git itself
  (the differential test of the untrusted listing against `git ls-files --others --exclude-standard`). Nothing to change.
- Speed: lz-oop's fixtures run `git init` and one `git commit` per commit per test. Copying one initialised repository
  per process and writing commits without extra Git starts is the largest saving on offer; it is worth a spike only if
  the `lz-oop:test` target's ~2.5 min becomes a cost. Not done in this run (hold the scope).
- Isolation (checked 2026-11-24): `fixtures.ts` passes `{ ...process.env, GIT_AUTHOR_DATE, GIT_COMMITTER_DATE }` to Git
  and sets `GIT_CEILING_DIRECTORIES` and `GIT_TEST_ASSUME_DIFFERENT_OWNER` per test. It does not clear inherited `GIT_`
  variables or set `GIT_CONFIG_NOSYSTEM` or `GIT_CONFIG_GLOBAL`, so the developer's global and system Git config reach
  the fixtures. lz-gardening found tests that passed only under Claude Code for this reason. The cheapest fix is
  lz-gardening's: clear `GIT_*` except `GIT_CONFIG_*`, set `GIT_CONFIG_NOSYSTEM=1` and a fixed `GIT_CONFIG_GLOBAL`.
  Claude recommends it as a follow-up, not part of this run.
- Production: `hotspots` runs a handful of Git commands per audit, so a batch reader is not worth it here.
- Cross-OS: lz-oop already runs the script tests on Windows and in Linux Docker on Node 22 and 24; the Git version in
  that container is the open point (lz-gardening calls 2.39 too old for it).
