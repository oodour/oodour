# Decision: how the lz-oop CLI keeps an untrusted repository from making Git open a network path

Opened 2026-11-23 (AFK run), after review round 9. Playbook: lars-mode `decide.md`. Lars's direction for it (verbatim):
"How round 9 is fixed: Research prior art solutions on the web/GitHub. Consult lars-* skills and pstack plugin skills,
including /lars-mode and /poteto-mode with their playbooks and principles. Consider writing plans and having them
reviewed by thermos, security-review, and security-audit before implementing them."

## The question

The bundled CLI (`plugins/lz-oop/scripts/`) runs Git on a repository the user may not have written. On Windows, a
path such as `\\host\share` that Git opens sends the user's credentials to that host. How should the CLI keep the
repository from making Git (or the CLI itself) open a network path?

## Constraints and invariants

- Lars, 2026-11-23: "Network-path check before git runs: OK" (option (b) of the round 6 pattern question; the check
  that reads the metadata itself before Git runs).
- Runs on the user's machine without admin rights; Windows 11 (x64, ARM64), Linux, macOS; Node.js 22 and 24.
- Must read the history of an ordinary repository, renames included, and list its tracked and untracked sources; must
  not refuse an ordinary repository (a plain clone, a linked work tree, a submodule, a bare repository, reftable, a
  nested repository, `includeIf`, config values that are not paths).
- The user's own global Git config and Git environment variables are trusted. Known limits on record: a drive letter
  mapped to a share or a `subst` drive; Git before 2.44 for lazy fetch and before 2.43 for `attr.tree`.
- Prerelease, no users yet (Lars, 2026-11-20): no compatibility ceremony.
- The plugin adds no dependency without a strong reason (Claude's reading of the plugin's current state: the CLI has
  `typescript` and nothing native).

## What happened

Rounds 4 to 9 each found new routes past the check (rows triaged: 25, 20, 10, 10, 15, about 10; round 9 has 7 major).
Since round 7 every major finding is one kind: Git opens a file the check did not read, or reads a name differently,
and the path reaches a share. Round 9 also found two regressions in round 8's own fixes. The shared assumption of every
fix since round 6: the check can name every file Git opens, from the metadata, before Git runs.

## Options (no order implied)

1. **Do nothing more** beyond the round 9 fixes. Undo cost: none.
2. **Route by route**: fix each finding as found, run more rounds. Undo: revert commits.
3. **One rule over links**: refuse the repository when any link below its top folder (work tree and git folders)
   leads to a network path, so every `..` route through a link closes whatever file names it; keep the name-reading
   fixes (trailing dots and spaces, lone surrogates, drive-relative names). Undo: revert; costs a tree walk per run.
4. **Contain Git**: start Git so the system itself refuses network paths (a sandbox or restricted token on Windows;
   the equivalents elsewhere). Undo: revert; cost depends on the mechanism (research topic B).
5. **No Git for untrusted data**: read the history and the file list without Git, through code whose file access the
   CLI controls. Undo: large; a rewrite of `churn.ts` and `files.ts`.
6. **State the limit**: document that the CLI must run on untrusted repositories only inside a sandbox, and stop the
   rounds. Undo: none.
7. **Trust gate**: run Git only on a repository the user says is trusted (the way VS Code's workspace trust and
   JetBrains' safe mode do); otherwise run the CLI's existing no-Git path (its own file walk, no history), so an
   untrusted repository gets a report without churn. Who states the trust (a flag the skill passes after asking the
   user, or a stored list) is part of this option. Undo: revert; the no-Git path already exists.
8. Combinations of the above.

## Facts (dossier)

Each fact names how it is known. "Measured" means a probe on this machine (Windows 11 ARM64 Insider build 26300,
Git 2.54.0.windows.1, Entra ID account, loopback servers only) unless it says otherwise.

### What Git and the tools around it do

- Git's manual, SECURITY section (`Documentation/git.adoc` at v2.56.1, read by Claude): running Git in a `.git` from an
  untrusted source is not safe; it names the extracted archive; the advice is `git clone --no-local` to a clean copy,
  with a warning that `upload-pack`'s attack surface is large. (Researcher A: the section dates from 2.45.1.)
- The `upload-pack` run of such a clone still opens the source's `.git` file, `commondir`, alternates, multi-pack-index,
  commit-graph, reftable list and config includes; the copy has no untracked files or index (researcher A, inferred
  from source, not measured).
- Ownership checks (`safe.directory`, libgit2 owner validation, gitoxide `Trust`) pass an archive the user extracted
  (source).
- Git for Windows shipped NTLM-leak fixes in 2026, each for one route: HTTP NTLM off by default, symlink targets at
  checkout, a lexical UNC check on the `.git` file text (2.55.0, from TortoiseGit 2.19), bundle URIs (release notes,
  advisories, source at v2.56.0.windows.4). The `.git` file commit calls running Git on an extracted archive of
  dubious origin "never a good idea" (researcher A's quote of the commit message).
- No surveyed tool checks every path a repository can make Git open. VS Code and JetBrains ask a human to trust the
  folder before Git runs; CI and scanners isolate the machine; the rest patch routes one by one (researcher A, source
  and docs).
- VS Code's `security.restrictUNCAccess` is a patch to its own Node.js: a lexical host allowlist on path strings,
  passed to Node children by an environment variable; it does not cover git.exe or links (2023 source; the current
  patch is not public).
- Microsoft's controls for outbound NTLM (`Set-SmbClientConfiguration -BlockNTLM`, the "Restrict NTLM: Outgoing"
  policy, blocking TCP 445, Protected Users) need admin or domain admin (docs). On this machine BlockNTLM is off and
  the WebClient service runs (measured, read-only).

### Mechanisms that stop a process opening network paths (researcher B)

- Baseline: `git log` on a repository whose alternates name a WebDAV path made WebClient send an NTLM offer to a
  loopback listener, and Git still exited 0 (measured).
- AppContainer with no capabilities, started from the built-in `powershell.exe` 5.1 with `Add-Type` (no admin, no
  native module): SMB and WebDAV opens refused, no request reached the listener; Git gave the same `log -M
  --name-status` and `ls-files --others` output, but only after an access entry for the container was added to the
  repository's ACL; the user's Git config and ignore file are not read; a registered profile is needed; 1 to 2.8 s
  per Git call; fails under PowerShell ConstrainedLanguage mode (measured; documented by Microsoft and Chromium).
- Restricted token (restricting SIDs) from PowerShell: UNC opens refused before any connection, the repository and
  user config read with no ACL change (measured on this machine only); undocumented, and Anthropic's sandbox-runtime
  README reports a write-restricted token of a local account reaching SMB.
- Low integrity: stops nothing (measured). Job objects: no file-access control (docs). Windows Sandbox: needs an
  admin-enabled feature, not on Home (docs). sandbox-runtime and Codex on Windows use a dedicated account and the
  firewall after one elevated install, and say SMB is not covered (docs).
- Linux and macOS: `//host/share` has no network meaning; only existing mounts and automount maps reach the network,
  without NTLM (docs).
- Node.js `--permission`: a lexical check on Node's own fs calls that follows links; nothing carries to git.exe
  (source at v22.23.5 and v24.22.3).
- None of the process-level options covers files the CLI's own Node.js process opens.

### Reading Git data without Git (researcher B)

- isomorphic-git (pure JavaScript; source at v1.44.13, measured with 1.44.18): implements no config includes,
  alternates, `commondir`, multi-pack-index, commit-graph or reftable, and ignores nested `.git`; still follows a `.git`
  file (measured: an NTLM offer was sent) and the system's links. Every open goes through an `fs` object the caller
  passes (measured: a proxy saw the UNC name before the open). No rename detection (measured: a rename was missed); an
  ignore list that differs from Git's; whole packs in memory; repositories that use alternates, linked work trees or
  reftable cannot be read.
- libgit2 and gitoxide follow alternates, `.git` files and `commondir` and join multi-pack-index names unchecked, as
  Git does; their Node.js bindings are native (source at v1.9.4 and v0.62.0).

### The CLI today

- Outside a repository, the CLI already walks the folder itself and reports without history
  (`plugins/lz-oop/scripts/files.ts`, `sources` with `repository === undefined`).
- The metadata check walks the git folders, their links and config values; round 9 found 7 major routes past it, 2 of
  them regressions of round 8's fixes (cli-r1-triage.md, Round 9).

Sources in full:
- `C:/Users/LARSGY~1/AppData/Local/Temp/claude/4ec5e242a5a42496/17f94589-bf36-47a0-a4fc-f6884d5e4fb6/scratchpad/network-guard-research-a.md`
  (prior art in tools that run Git on untrusted repositories)
- `C:/Users/LARSGY~1/AppData/Local/Temp/claude/4ec5e242a5a42496/17f94589-bf36-47a0-a4fc-f6884d5e4fb6/scratchpad/network-guard-research-b.md`
  (system mechanisms that stop a process opening network paths; Git readers that need no Git)
- the round 9 triage, section "Round 9" of
  `C:/Users/LARSGY~1/AppData/Local/Temp/claude/4ec5e242a5a42496/17f94589-bf36-47a0-a4fc-f6884d5e4fb6/scratchpad/cli-r1-triage.md`

## Advice (one fable-high advisor, 2026-11-23 21:13 to 21:23 local)

Full text: `C:/Users/LARSGY~1/AppData/Local/Temp/claude/4ec5e242a5a42496/17f94589-bf36-47a0-a4fc-f6884d5e4fb6/scratchpad/network-guard-advice.md`.

- Stance: option 7 with option 6 folded in. Git runs only when the caller states the repository is the developer's own
  or their own clone (an opt-in flag; by default no Git); otherwise the CLI takes its no-Git path. Stop the rounds on
  `metadata.ts` and keep it as a best-effort alarm for plain network names; build none of options 3, 4, 5. Deleting
  `metadata.ts` outright would reverse Lars's "Network-path check before git runs: OK", so that is his call.
- Reasons: the claim cannot be proved with Git in the loop (Git's own manual, Git for Windows' maintainers, no
  surveyed tool checks every path); the lz-audit skill tells the model to run `git log -S` and `git blame` on the
  audited repository, which a check in the CLI cannot reach; where the CLI makes an open itself, the check sits at the
  open and has held.
- Rejected: 3 closes only routes two overrides already close; 4 needs an ACL entry written into the audited
  repository (AppContainer) or rests on undocumented behaviour (restricted token); 5 misses renames and still follows a
  `.git` file; 6 alone leaves the skill's Git commands.
- Would change it: Lars saying the plugin audits the developer's own code only (then 6 alone); a primary source or a
  second machine for the restricted token; an eval showing the model passes the flag without the developer's yes.

Claude checked the two facts the advice adds (measured 2026-11-23):
- `git blame a.ts` and `git log -S name` started the program a repository's `diff.x.textconv` names (with a
  `.gitattributes` line); `--no-textconv` stopped `log -S` from starting it (Git 2.54.0.windows.1; probe
  `scratchpad/probe-textconv.ts`). The skill's `allowed-tools` grants only `Read` and the CLI, so each such command
  needs the user's permission today.
- Outside a repository the CLI lists files with `globSync('**/*')` (`files.ts`), which on Node.js 22.23.1 lists the
  files below a junction (`j\x.ts`) and on 24.22.0 and 26.13.0 stops at it.

Routing: the choice changes what the audit shows for an untrusted repository and adds a question the skill asks, which
is product direction, so it goes to Lars as a recommendation, with a plan reviewed by thermos, security-review and
security-audit as he asked.

A test of the shared assumption (Claude's idea): trace the files Git actually opens during the CLI's commands on probe
repositories (strace on Linux, a file-access trace on Windows) and compare them with what the check reads.

Run 2026-11-24 (Lars: "Item 3, an untested idea from the network-guard decision: OK"), Linux only: a Windows
file-access trace needs an elevated prompt (wpr, xperf) or Process Monitor, which is not installed. Docker
`node:24-trixie` (Git 2.47.3, Node.js 24.22.3, strace 6.13), plugin at b597195, `strace -f -y` on
`node lz-oop.ts --trusted-repository hotspots -- <scope>`. Ten probe repositories whose metadata names files under a
separate `/far/<probe>` tree: plain; a `.git` file naming a separate git folder; a linked work tree whose
`config.worktree` includes a file; a relative alternate whose own alternate names a third object store; a chain of two
includes, the second relative to the first; `includeIf` on `gitdir` and `onbranch`; `core.excludesFile` and
`core.attributesFile`; `core.worktree` moved out; reftable; a submodule audited from inside. The check counts as the
CLI's own Node.js process plus its `git config --file` children; Git is every other git process. [measured]

- In all ten, every path Git touched under the probe's trees (`rev-parse`, `ls-files`, `log`) was one the check had
  touched first, or lies in a folder the check had touched first: refs, loose objects, `index`, `HEAD`,
  `info/exclude`, and the probes for `shallow`, `info/grafts` and `packed-refs`. Under `/far`, Git opened nothing in a
  folder the check had not read; the include files, `config.worktree`'s include, both alternates and the separate git
  folder were all read by the check before Git ran. [measured]
- `core.worktree` pointing out of the scope: the CLI stopped after `rev-parse` ("the repository's work tree ... does
  not hold ..."), and Git had opened only `HEAD` before that. [measured]
- What this does not show: the routes rounds 4 to 9 found were Windows name readings (drive-relative names, `\` roots,
  links, short names, UNC forms), which a Linux trace cannot exercise; a link below a checked folder (no probe had
  one); Git versions other than 2.47.3; programs Git starts; and the Git commands the lz-audit skill has the model run
  itself. So the premise held on these ten shapes on Linux and stays unproven where the earlier findings were.
  [inferred]
- Probe scripts and traces: `C:/Users/LARSGY~1/AppData/Local/Temp/claude/4ec5e242a5a42496/17f94589-bf36-47a0-a4fc-f6884d5e4fb6/scratchpad/strace/`
  (`probes.sh`, `analyze-trace.ts`, `analysis.txt`).
