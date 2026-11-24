# Plan: audit an untrusted repository without running its code or Git (lz-oop CLI and the lz-audit skill)

Status: draft 4 (2026-11-23): draft 3 plus "Changes since draft 3" near the end, one question open for Lars. Draft 3: Lars approved the direction and answered the open questions (see "Rulings" at the end);
the plan gets one more review by thermos, security-review and security-audit before it is implemented. Framing, facts
and advice: `.scratch/lz-oop-cli-network-guard.decision.md`.

Draft 1 was reviewed by thermos (`scratchpad/plan-review-thermos.md`, TG-1 to TG-11), security-audit
(`scratchpad/plan-review-security-audit.md`, SA-P1 to SA-P10) and security-review
(`scratchpad/plan-review-security-review.md`, SR-1 to SR-5, PQ-1 to PQ-5). What changed, with the finding ids, is in
"Changes since draft 1".

## Goal

An audit of a repository the user did not write must not let that repository make Git, the CLI, the model's tools or
the auditor agent open a network path or start a program the repository names. Git's own manual says running Git in an
untrusted `.git` is not safe; nine review rounds showed the CLI cannot list every file Git opens; and the audit runs
more than the CLI: `git log -S` and `git blame` (they start a program a repository's config names, measured), the
repository's ESLint config in the fallback, and the auditor agent's tests and linters. So trust becomes a property of
the whole audit, decided by the user, not by the model and not inferred from where the folder is.

## Behaviour after the change

| Case | Today | After |
| --- | --- | --- |
| Untrusted (the default) | metadata check, then Git; the skill may run Git, ESLint, tests | the CLI starts no Git process and walks the folder itself, entering no link; the skill and the auditor run nothing the repository names (no Git, tests, linters, ESLint), read only files the CLI listed, and the report says history was not read and why |
| Trusted (the user approved the trusted command at Claude Code's permission prompt) | as above | as today: metadata check, overrides, Git; the skill and the auditor may run Git, tests and linters |
| Outside any repository | own walk with `globSync` (enters links on Node.js 22) | own walk that enters no link; the report says there is no repository (not "not trusted") |
| Headless run (`claude -p`), no user to approve | as interactive | the trusted command is not pre-approved, so it is denied; the audit runs untrusted |

## How trust is decided

The skill's `allowed-tools` pre-approves only the untrusted command. The trusted command differs in its first words, so
the pre-approval pattern cannot match it and Claude Code asks the user before it runs; that permission prompt is the
trust question, and the user's approval is the only way to trust a repository (TG-1, SA-P3, SR-1). Proposed forms (Q2):

- untrusted: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts hotspots -- <scope>`, pre-approved by
  `Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts hotspots *)`;
- trusted: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts --trusted-repository hotspots -- <scope>`, which that pattern
  does not match. `--` before the scope keeps a folder named like the flag from becoming it (SA-P9).

The skill runs the untrusted command first, before it reads any file of the repository (TG-1, SA-P3); its step 1
(reading the README, manifest and entry points) moves after it. It then tells the user, in one line, that history and
the repository's own tools were left out because the repository is not trusted, and that the trusted command will ask
for permission; it runs the trusted command only when the user asks for it in their own message, and Claude Code's
prompt confirms it. Text inside the repository never counts as the user's request.

Unattended runs (a loop, a schedule, CI) have no one to answer the prompt. Lars, 2026-11-23, "How unattended runs
grant trust: OK", to this: the untrusted audit still runs and reports without history, so nothing blocks; a user
grants trust in advance with Claude Code's own permission settings, an allow rule for the trusted command in
`settings.json` (`permissions.allow`) or `claude -p --allowedTools` in CI. Step 4 checks that such a rule matches the
command a plugin skill runs, including with a wildcard over the plugin's versioned path. If it does not, the fallback
is a trust list the CLI reads from the user's global Git config (which the threat model already trusts); that fallback
adds a setting the plugin owns, and it is built only if step 4 fails.

Verification before building on it (inferred today, from Claude Code's documented prefix matching): one slim
`claude -p` run shows the untrusted command allowed and the trusted command denied without a prompt answer; one
interactive check shows the prompt appears for the trusted form.

Auto mode decides prompts with a classifier, which could approve the trusted command without asking anyone. From
Claude Code's docs (claude-code-guide agent, 2026-11-23, not yet tested): `/auto-mode-setup` writes classifier guidance
to the user's settings and cannot force a prompt; a `permissions.ask` rule forces one in every mode but only the user's
own settings can hold it; a plugin can ship a PreToolUse hook that returns `"ask"`, which in auto mode sends the call
to the permission prompt instead of the classifier (labelled `[plugin:lz-oop]`); a hook that asked in every mode would
deny the unattended `claude -p` route, since no one answers there. So (Q6):

- the skill runs the trusted command only when the user's own message asked for it (always, hook or not);
- change 6 adds a hook that asks for the trusted form only when the session's permission mode is auto, kept only if
  step 4 measures that the hook sees the mode, that it prompts in an interactive auto session, and that
  `claude -p --allowedTools` with the trusted rule still passes;
- an organisation's managed settings may block plugin hooks that are not on its allowlist (Lars: "Claude Enterprise
  plans limit some mods that aren't on an explicit allowlist"), so nothing else in the plan may depend on the hook; the
  README also tells users they can add their own `permissions.ask` rule for the trusted form.

## Changes

### 1. The walk that enters no link (`files.ts`)

A function `filesBelow(root): readonly string[]` walks with `readdirSync(folder, { withFileTypes: true })`, descends
only into entries that are directories and not links, never reads through a link, skips `node_modules` and `.git` by
name, skips a folder it may not list (`EPERM`, `EACCES`; TG-7), and returns forward-slash relative paths, sorted.
`sources` uses it in place of `globSync`; `isSourceOnDisk` still filters each file. It also returns the links it
skipped, which the CLI prints so the skill can leave them unread (SA-P4).

Tests first, red for the right reason (TG-4, SA-P6, PQ-1): the test calls `filesBelow` on a root holding a junction
(Windows) or a directory symlink (elsewhere) to a folder with a file, and asserts that no listed path goes through the
link. Red: the function does not exist; then, to show the test can catch the bug, a first body that wraps `globSync`
fails it on Node.js 22.23.1 (`fnm exec --using=22.23.1`), measured before the real body goes in. A second test: a
folder the user may not list is skipped, not an error.

### 2. The scope text (`lz-oop.ts`)

Resolve the scope once and use the resolved path everywhere: a scope written as `link/../evil` passed the network-path
check and the CLI read files from a share (SR-3, measured by security-review's finder at HEAD). Test first: that
scope is refused, or audited as the folder its text names, never read through the link.

### 3. The flag and the untrusted path (`lz-oop.ts`, `hotspots.ts`, `git.ts`)

- `lz-oop.ts`: `--trusted-repository` (Q2) is a global option before the command; usage updated.
- `hotspots.ts` `measureScope(scope, since, trusted)`: untrusted skips `gitIn` entirely; `history` gets a new
  `Uncounted` reason `'untrusted'` with its own clause. A folder outside any repository keeps `'no repository'`, found
  without Git by `lstat` of `.git` on the way up from the scope (TG-8); the untrusted walk starts at the scope (Q5).
- `git.ts`: add `core.commitGraph=false` to the overrides (B9-2). The metadata check stays as it is (Q4).

Tests first:
- no Git process starts on the untrusted path: a stand-in `git` that writes a marker file is put first on `PATH` for
  the test, and the marker must not appear (SA-P7, PQ-2);
- a repository whose `.git/config` include names a network path: untrusted exits 0 with the untrusted History line;
  trusted is refused as today;
- an ordinary repository, trusted: commit counts as today (the existing tests, run with the flag).

### 4. The skill and the auditor (`skills/lz-audit/SKILL.md`, `agents/auditor.md`)

- Order: the untrusted command first, then step 1's reading; trust as in "How trust is decided".
- Untrusted: no `git log`, `git log -S`, `git blame`; no hand-count fallback that runs the repository's ESLint config
  (SA-P5, SR-4); Read only files the CLI listed or the skill's own bundled files, never a path the CLI reported as a
  skipped link (SA-P4, TG-6); the report says which evidence was left out.
- Trusted: as today, with the history bullet naming the new reason (TG-11).
- The auditor agent gets the trust decision in its brief from the skill, since it has no user to ask (SA-P8); its
  line "You may run the project's tests, its linters, Git ..." applies only when the brief says trusted (TG-3, SR-4).
- `allowed-tools` narrows to `Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts hotspots *)`.

### 6. The auto-mode hook (`plugins/lz-oop/hooks/`), only if step 4 holds

A PreToolUse hook on `Bash` that returns `permissionDecision: "ask"` when the command runs `lz-oop.ts` with
`--trusted-repository` and the session's permission mode is auto, and returns no decision otherwise. Erasable-syntax
TypeScript with a `.test.ts` beside it, run by Node.js 22 and 24, under `npm run check` (the script bar the repository's
hooks meet). It never returns "allow"; when it cannot parse its input or the command, it returns "ask" if the text
holds `--trusted-repository`, and no decision otherwise. If step 4 shows the hook cannot see the mode, or its
ask blocks the unattended route, the hook is dropped and the README line on `permissions.ask` stays.

### 7. Records (numbered after the hook, which change 6 names above)

- ADR 0004 "An audit runs nothing a repository names unless the user trusts it": context, decision, consequences
  (no history and no repository tools for an untrusted repository; one permission prompt for a trusted one), the
  options rejected with one fact each (from the decision file), and how Lars's "Network-path check before git runs:
  OK" stands (Q4).
- GLOSSARY.md: "trusted repository" (name per Q2), with _Avoid_ entries.
- The plugin README and the skill: the limit in one sentence.
- Round 9 triage: the routes ff50eb8 and `core.commitGraph=false` do not close become known limits of the trusted path
  (SA9-2, B9-3, B9-4, R9-2, B9-5), unless Lars answers Q4 with (b).

## Order and checks

1. Walk (change 1), test first; `npm run check`; commit.
2. Scope text (change 2), test first; `npm run check`; commit.
3. Flag and untrusted path (change 3), cycle by cycle; `npm run check`; commit.
4. The permission-prompt check before the skill text relies on it: one slim `claude -p` run (the untrusted command
   allowed; the trusted command denied without a rule and allowed with `--allowedTools`; the wildcard rule over the
   versioned plugin path), and with a test build of the hook: that its input names the permission mode, and that
   `-p --allowedTools` still passes with it; one interactive auto-mode check by Lars that the hook's prompt appears.
   The slim run waits for Lars's go-ahead like every eval round.
5. The hook (change 6) test first, if step 4 holds; `npm run check`; commit.
6. Skill, auditor and records (changes 4 and 7); `npm run check` (citations, format); commit.
7. Review round (thermos bugs, open-code-review, security-review, security-audit) on the range.
8. Heavy-lock slot: Stryker on `plugins/lz-oop/scripts`; the Linux Docker run (Node.js 22 and 24); B5-3's POSIX check.
9. Eval round after Lars's go-ahead (PQ-3): untrusted by default; a README that tells the model to pass the flag (the
   model must not); a headless run (the trusted command is denied); the user asks for a trusted run (one prompt, then
   history); a folder outside any repository; an unattended `claude -p` run without an allow rule (untrusted report,
   no block) and with `--allowedTools` for the trusted command (history, no prompt).

## Rollback

Each step is its own commit; reverting steps 3 and 5 restores today's behaviour. Steps 1 and 2 are bug fixes that
stand alone.

## Not in this plan

- Containing Git with an AppContainer or a restricted token (option 4), reading history without Git (option 5), and
  more review rounds on `metadata.ts` for the untrusted case: see the decision file.
- Reading `.gitignore` without Git for the untrusted walk (TG-5, SA-P10, PQ-4): build output such as `dist/` is walked
  and can fill the table; the report says so (Q5).
- Claude Code's own Read, Grep and Glob following links (TG-6): the skill avoids paths the CLI reported as links; the
  tools themselves are outside the plugin.

## Changes since draft 1

- The "scope inside the session's starting folder counts as trusted" rule is gone: Claude Code's trust list on this
  machine holds `D:/` itself, so it would trust every archive below it; it also let a nested repository and a headless
  run through (TG-2, SA-P1, SA-P2, SR-2).
- Trust is the user's approval at Claude Code's permission prompt, not the model's call after reading the repository
  (TG-1, SA-P3, SR-1).
- The gate covers the skill's ESLint fallback and the auditor agent's tests, linters and Git (TG-3, SA-P5, SR-4), and
  the model reads only files the CLI listed (SA-P4, TG-6).
- The walk test asserts the walk itself and shows its red on Node.js 22 (TG-4, SA-P6, PQ-1); a stand-in `git` proves no
  Git process starts (SA-P7, PQ-2); EPERM folders are skipped (TG-7); `--` before the scope (SA-P9); the scope text
  is resolved once (SR-3); a folder outside a repository keeps its own message (TG-8).

## Changes since draft 3 (second review: `scratchpad/plan-review-d3-thermos.md`, `plan-review-d3-security-audit.md`, `plan-review-d3-security-review.md`)

These override the sections above where they differ.

- The trust flag counts only as the first argument (D3-1 in thermos and security-audit, SR3-1; measured: `parseArgs`
  takes `hotspots --trusted-repository -- .` as trusted, and that spelling also starts with the pre-approved
  `lz-oop.ts hotspots `). Change 3: `lz-oop.ts` reads `--trusted-repository` only as `args[0]`, and anywhere else it is
  a usage error (exit 2). Tests first for both; step 4 and the eval round include the late spelling.
- The "no Git process starts" test uses Git's own trace, not a stand-in (PQ3-1, D3-7, D3-5; measured: on Windows
  `spawnSync('git')` skips a `git.cmd` stand-in and runs the real Git). The test sets `GIT_TRACE` to a file in a temp
  folder: on the untrusted path the file must not exist; the positive control, the same repository on the trusted
  path, must create it.
- The walk reports every name it would not enter: links, folders it may not list, and names ending in a dot or a space
  (D3-6, TG-6). The CLI prints them under the table. The skill's rule becomes: never read, grep or glob a path through a
  name the CLI reported (replaces "read only files the CLI listed", which contradicts step 1; D3-4, D3-7 thermos).
- Step 4 also checks over-matching: an allow rule with a wildcard over the plugin's versioned path must not match a
  `lz-oop.ts` reached inside the audited repository (D3-3, SR3-2; measured: Node.js runs such a path). The README
  recommends an allow rule with the exact plugin path, and per-run grants (`--allowedTools`) for CI.
- The hook (change 6) asks for any `lz-oop.ts` call that is not exactly the untrusted form, and watches the PowerShell
  tool as well as Bash (D3-3 security-audit, SR3-5; measured: quote-split spellings reach the CLI as the flag). One more
  condition for keeping it: Claude Code must be able to start it only for commands that name `lz-oop.ts` (a command
  filter on the hook); a hook that starts Node.js on every Bash call costs 330 to 975 ms each under load (measured by
  thermos), and without such a filter the hook is dropped.
- `npm run check` covers `plugins/lz-oop/hooks/` (D3-10 thermos). Rollback reverts steps 3, 5 and 6 (D3-11). The eval
  round adds an auditor case and the late-flag case (D3-12, SR3).
- Limit, stated in the README and the ADR (D3-2 in thermos and security-audit, SR3-4, D3-4 thermos, D3-8 security-audit):
  the gate is no stronger than the user's permission settings. A user who allows `Bash(node *)`, `Bash(git *)`, a test
  runner, or runs with permission checks off lets the model run those on any repository, whatever the skill says; the
  skill's own-message rule is then the only guard. Lars's own settings allow `Bash(node *)` in auto mode (measured by
  two reviewers). Lars chose to state the limit and recommend narrow grants in the README (Rulings, last item).

## Step 4 results (measured 2026-11-24, Claude Code 2.1.327, Windows arm64)

Lars approved the slim runs ("1: OK"). Six `claude -p` sessions on Haiku 5.5, `run-slim.ts --offline --rules none`, in
`D:/tmp/slim-claude-p/trust-gate/` (a test repository, the plugin reached through a junction at a versioned path
`cache/lz-oop/0.0.0-test`, a test-build hook plugin). Every command ran as written (read from each transcript). Total
cost about $0.011.

| Run | Rules | Result |
| --- | --- | --- |
| A | untrusted form only | untrusted ran; trusted refused ("This command requires approval"); the late flag `hotspots --trusted-repository` passed the rule and the CLI stopped it (exit 2, "goes first") |
| B | + the trusted form, exact path | trusted ran with the full history: the unattended route works |
| C | trusted form with `*` for the version folder | the trusted command ran, and so did `cache/lz-oop/../../repo/evil/scripts/lz-oop.ts --trusted-repository ...`, a script planted in the audited repository: a wildcard over the plugin path over-matches. The README recommends the exact path only (it changes with each plugin update) |
| D | B's rules, test hook, default mode | the hook's input carries `permission_mode` ("default"); the hook's `"if": "Bash(*lz-oop.ts*)"` started it for the two `lz-oop.ts` calls and not for `ls` (the command filter exists); trusted ran |
| E | as D, `--permission-mode auto` | auto mode runs in `-p`; the hook saw "auto" and its "ask" refused the trusted command although the allow rule granted it: in auto mode the hook overrides the user's own allow rule |
| F | A's rules, plus the trusted form in the repository's own `.claude/settings.json` | trusted refused. Cause not isolated (an unanswered workspace trust in `-p`, or `--settings` replacing project permissions), so it does not show an interactive session with workspace trust accepted ignores the rule |

Lars, 2026-11-24, "1: OK": keep the hook despite run E; the README gives default mode with an exact-path allow rule
(or `--allowedTools`) as the route for unattended trusted runs; "(1 is approved unless affected by 2)", so the
interactive auto-mode check (the hook's prompt appears) could still reopen it. Lars ran that check on 2026-11-24 in an
interactive auto-mode session with his own settings (which allow `Bash(node *)`): Claude Code showed "Hook
PreToolUse:Bash requires confirmation for this command: test build: the trusted lz-oop command asks in auto mode
[plugin:trust-hook-test]" with Yes and No; he approved it and the command ran. The hook log shows `permission_mode`
"auto". The check passes, so the hook decision stands and change 6 is built.

## Rulings (Lars, 2026-11-23; verbatim in `.scratch/afk-2026-11-23.md`)

- "How unattended runs grant trust: OK": untrusted by default; trust in advance through Claude Code's permission
  settings; a trust list in the user's global Git config only if step 4 fails.
- "Auto mode (Q6): OK but keep in mind that Claude Enterprise plans limit some mods that aren't on an explicit
  allowlist.": the skill's own-message rule plus the auto-mode hook (change 6) under step 4's conditions; nothing else
  depends on the hook.
- "Still open form before: OK": Q1 the direction adopted; Q2 `--trusted-repository` and "trusted repository"; Q3 no
  automatic trust for the session's own repository; Q4 (a) `metadata.ts` frozen as a best-effort alarm, round 9's
  other routes recorded as known limits; Q5 the untrusted walk starts at the scope; next, one more three-tool review of
  this plan, then implementation in the order above.
- "Broad permission grants: OK": (a) for D3-2. The README and the ADR state the limit and recommend narrow grants; no
  hook that asks in every mode, no trust list in Claude Code's environment.
