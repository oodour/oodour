# Spike: bundled CLI install (marketplace install, allowed-tools on Windows, subagent grant)

Claude (spike subagent), 2026-11-20. Approval (Lars, 2026-11-20, verbatim): "Spike for a bundled CLI install: OK".
Background: `.scratch/lz-oop-cli-research.md` ("Not checked"). Labels: **[measured]** = observed in a run below,
**[inferred]** = reasoning, not checked by a run. Claude Code 2.1.327, Node.js v24.22.0, Windows 11 arm64.

Everything lives under `D:/tmp/lz-oop-cli-spike/`:

- `plugin-repo/` - git repo, the plugin `cli-spike` (plugin.json, package.json pinning `typescript` `6.0.3`, lockfile v3,
  `scripts/hello.ts`, `skills/hello/SKILL.md`, `agents/greeter.md`).
- `market/` - git repo, `.claude-plugin/marketplace.json`, plugin source `{"source":"url","url":"file:///D:/tmp/lz-oop-cli-spike/plugin-repo"}`.
- `config/` - isolated `CLAUDE_CONFIG_DIR`.

## Setup log

| Step | Command | Exit | Result |
| --- | --- | --- | --- |
| Lockfile | `npm install --package-lock-only --ignore-scripts` (in `plugin-repo/`) | 0 | lockfileVersion 3, typescript 6.0.3 [measured] |
| Login in isolated config | `CLAUDE_CONFIG_DIR=D:/tmp/lz-oop-cli-spike/config claude auth status` | 1 | `"loggedIn": false, "authMethod": "none"` [measured] |

The isolated config has no login: on Windows the subscription login lives in the config folder's
`.credentials.json`, which an empty `CLAUDE_CONFIG_DIR` lacks [measured: status above; file location inferred].
Copying the credentials file was not done (it would duplicate Lars's OAuth token outside `~/.claude`, and a refresh
in the copy could rotate the token) [inferred risk]. So the plan splits:

1. Install from the marketplace into the isolated config (no login needed for install, to be measured) and inspect
   its cache folder.
2. Run the one `claude -p` session with Lars's normal login through `run-slim.ts`, loading that **installed cache
   folder** with `--plugin-dir`. The code, `node_modules` and paths are what the marketplace install produced; the
   difference from a real install is that `${CLAUDE_PLUGIN_ROOT}` points under `D:/tmp/...` instead of
   `C:/Users/<me>/.claude/plugins/cache/...` [inferred: both are forward-slash Windows drive paths].

## Install (isolated config)

| Step | Command (env `CLAUDE_CONFIG_DIR=D:/tmp/lz-oop-cli-spike/config`) | Exit | Result |
| --- | --- | --- | --- |
| Add marketplace | `claude plugin marketplace add 'D:/tmp/lz-oop-cli-spike/market'` | 0 | "Successfully added marketplace: cli-spike-market" [measured] |
| Install | `claude plugin install cli-spike@cli-spike-market` | 0 | "Successfully installed plugin ... (scope: user)", no login needed [measured] |
| Run from cache | `node '<cache>/scripts/hello.ts'` | 0 | `typescript 6.0.3`, `dirname D:\tmp\lz-oop-cli-spike\config\plugins\cache\cli-spike-market\cli-spike\0.0.1\scripts` [measured] |
| Which `typescript` loads | `node -p "require.resolve('typescript',{paths:['<cache>/scripts']})"` | 0 | `<cache>\node_modules\typescript\lib\typescript.js` [measured] |

- Cache folder: `D:/tmp/lz-oop-cli-spike/config/plugins/cache/cli-spike-market/cli-spike/0.0.1` (`<cache>`),
  recorded in `plugins/installed_plugins.json` with `gitCommitSha` 2022538 [measured]. The folder name is the
  `plugin.json` version, not the commit [measured].
- The `file:///D:/...` git URL source worked as a copy source: the cache holds a copy of the committed files plus
  `node_modules/` (no `.git`) [measured].
- `node_modules/typescript` landed in the cache folder and is the copy the script resolves (nearest `node_modules`) [measured].
- Install time: files copied at 23:34:30.08, `node_modules/` last written 23:34:38.99, `.in_use` 23:34:39.22 (file
  mtimes, local time), so about 9 s for the copy plus the `npm` install of `typescript` 6.0.3 [measured from mtimes;
  the command's own wall time was not captured because `bc` is missing in Git Bash]. Well under the 60 s limit.
- The Bash tool's deny rules for `node_modules` paths (Lars's `Read(**/node_modules/**)` and the guard) blocked `ls` of
  the folder; the version was read by running the installed code instead [measured].

## Sessions (slim `claude -p`, sonnet, default permission mode)

Common command (from `C:/Users/<me>/.claude/references/slim-claude-p/`):

```bash
node ~/.claude/references/slim-claude-p/run-slim.ts --cwd 'D:/tmp/slim-claude-p/lz-oop-cli-spike' \
  --prompt-file 'D:/tmp/slim-claude-p/lz-oop-cli-spike/prompt.md' --out <out.json> \
  --plugin-dir 'D:/tmp/lz-oop-cli-spike/config/plugins/cache/cli-spike-market/cli-spike/0.0.1' \
  --offline --rules none --model sonnet --timeout-min 10 [--allow 'Skill(cli-spike:hello)']
```

`--offline` gives the read-only allow list (no `node` rule), so the only route to running `node ...hello.ts` is the
skill's `allowed-tools`. Prompt: invoke `cli-spike:hello`, then spawn `cli-spike:greeter` in the foreground, report
outputs and denials. Evidence below is from the JSONL transcripts (main and `subagents/`), copied to
`D:/tmp/lz-oop-cli-spike/transcripts-run1/`, not from the model's answer.

| Run | Session | Exit / `is_error` | Cost (`total_cost_usd`) | Transcript |
| --- | --- | --- | --- | --- |
| 1 | 55b1fd76 | 0 / false | 0.050 | `Skill(cli-spike:hello)` -> error "Execute skill: cli-spike:hello. The user can add the allow rule Skill(cli-spike:hello) ..." (skill never ran). Greeter: `Bash node D:/tmp/.../0.0.1/scripts/hello.ts` -> "This command requires approval" |
| 2 (retry, setup reason: skill needed its own allow) | e1a3aa68 | 0 / false | 0.022 | `Skill` -> "Launching skill"; main `Bash node D:/tmp/.../0.0.1/scripts/hello.ts` -> `typescript 6.0.3` / `dirname D:\tmp\...\0.0.1\scripts`, no error; greeter's `Bash`, same command -> same output, no error; `permission_denials: []` |

Measured details:

- In print mode with default permissions, invoking a plugin skill that has `allowed-tools` is itself a permission
  request: run 1 refused the Skill call [measured]. Whether every plugin skill needs this, or only ones with
  `allowed-tools`, is not settled (one skill tested). For lz-oop this matters for headless and eval runs, not for an
  interactive user, who gets a prompt [inferred].
- `${CLAUDE_PLUGIN_ROOT}` was substituted as `D:/tmp/lz-oop-cli-spike/config/plugins/cache/cli-spike-market/cli-spike/0.0.1`,
  forward slashes, in the skill body and in the **agent body** too, although `--plugin-dir` was passed with
  backslashes [measured: skill's injected text and the greeter's system prompt in the transcripts].
- The agent also received the substituted path, so `${CLAUDE_PLUGIN_ROOT}` works in plugin agent bodies [measured].

## Answers

**(a) Does a marketplace install put dependencies in the cache?** Yes [measured]. A marketplace whose plugin source is
`{"source":"url","url":"file:///D:/..."}` (a local git repo by file URL) got copied into
`<config>/plugins/cache/<market>/<plugin>/<version>/` and `npm` installed `typescript` 6.0.3 into its
`node_modules/` in about 9 s; the script resolves that copy. Not tested: a relative-path plugin in a marketplace
added from a git URL, and the user-scope `~/.claude` cache path (only an isolated `CLAUDE_CONFIG_DIR`).

**(b) Does the skill's `allowed-tools` rule match the substituted Windows path?** Yes [measured, run 2]:
`Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/hello.ts*)` let `node D:/tmp/.../scripts/hello.ts` run with no denial, while
run 1 without the skill showed the same command is refused otherwise. Not tested: a path with a space (Lars's
profile path has none), a quoted path in the body, and the real `C:/Users/<me>/.claude/plugins/cache/...` path, which
differs only in drive and folder [inferred to behave the same].

**(c) Does the agent inherit the grant or need its own?** It inherited it, within the same turn [measured, one run
each]: the greeter (tools: Bash, no `allowed-tools`) was refused the command in run 1, where the skill never ran,
and ran it without a denial in run 2, after the main session had invoked the skill in that turn. Not settled: whether
the grant still reaches a subagent in a later turn (docs say the grant clears at the next user message), whether a
subagent that preloads the skill through `skills:` (the `lz-oop:auditor` shape) gets the grant without the parent
invoking it, and background subagents. Each is one more eval case.

**Update, 2026-11-24 eval round** [measured, one haiku run each, slim `claude -p` on stryker-js at 494e821, plugin at
0f4b7b1, offline allow list]:

- With `/lz-oop:lz-audit` invoked in the main session, the unquoted command ran in the main session and in both an
  `lz-oop:auditor` and a `general-purpose` subagent. The same command with the script path in double quotes was refused
  ("This command requires approval"), so a profile path with a space stays an open risk. A `--since $(date ...)` form
  was refused ("A nested command in this command can't be checked before it runs"); c21b3fe has lz-audit ask for the
  date written out. The `--trusted-repository` form was refused, as designed for print mode.
- With no skill invoked in the main session, the `lz-oop:auditor` subagent, its lz-audit text preloaded through
  `skills:` (seen in its transcript), was refused the command ("This command requires approval"). A preloaded skill
  does not carry its grant.
- A background `lz-oop:auditor` that loaded `lz-oop:lz-audit` with the Skill tool (Skill allowed with `--allow Skill`)
  then ran the command. Without that allow rule the Skill call itself was refused. 7e7099c has both plugin agents make
  that Skill call before their first command or Read.
- At c21b3fe, an `lz-oop:auditor` launched alone with only a scope and "not trusted" made the Skill call on its own, ran
  the command with no refusal, and went on to audit.
- Eval cases at c21b3fe (sonnet runner and judge, 3 runs, with and without the plugin, `-j 2`): audit-hot-spots 3/3
  with, 1/3 without; review-own-change 3/3 with, 0/3 without; review-developer-diff 3/3 with, 3/3 without. About 100 s
  a case.
- The reviewer, at 004a493, in a session without the plain `Read` allow rule (Skill allowed): an `lz-oop:reviewer`
  launched alone loaded `lz-oop:lz-review` with the Skill tool first and then read
  `${CLAUDE_PLUGIN_ROOT}/references/judging-design.md` with no refusal. A `general-purpose` subagent in the same setup,
  with no Skill call, was refused the same Read ("Claude requested permissions to read from ..."). So 7e7099c fixes the
  reviewer's Read grant too (measured, one run each).

**Update, 2026-11-24, a plugin folder whose path has a space** (Lars: "Item 1, the space in the profile path: OK")
[measured, one haiku run each, slim `claude -p` without the plain `Read` rule, Skill allowed, plugin copies under
`D:/tmp/slim-claude-p/lz-space/plug <X>/`]:

- `Read(${CLAUDE_PLUGIN_ROOT}/**)` granted the Read from the spaced folder in every variant.
- The old rule `Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts hotspots *)` refused the quoted command
  (`bashMiss:no-rule-match`), and refused it from a folder without a space too: it matched only while the model left
  the path unquoted.
- A rule with the quotes written in, `Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts" hotspots *)`, let the quoted
  untrusted command run from the spaced folder (`ruleSource: "command"`); the trusted form stayed refused.
- A `bin/lz-oop` launcher with `Bash(lz-oop hotspots *)` also ran, but its command never names `lz-oop.ts`, so the
  trust-gate hook's `if` would not see it, and the docs say claude.ai and Cowork do not install a plugin with a
  top-level `bin/` [docs, not measured]. Not taken.
- The trust-gate hook started from the spaced folder in both forms, the shipped shell form with quotes and the exec form
  (`"command": "node", "args": [...]`), shown by a probe hook that logged each start; the slim runner sets
  `disableAllHooks`, so these runs turned it off. Issue #38800 (quotes stripped) did not reproduce.
- aa113d1 quotes the path in the skill's commands and grant, moves the hook to the exec form the hooks reference
  recommends for a path placeholder, and quotes the README's rule. At aa113d1, a real `/lz-oop:lz-audit` session from
  the spaced folder wrote the quoted command itself and ran it under the skill's grant, and read its references.

## Login note

The isolated `CLAUDE_CONFIG_DIR` cannot run a session: it has no login [measured], and copying Lars's
`.credentials.json` was ruled out [inferred risk]. The session therefore ran on Lars's normal login through
`run-slim.ts` with `--plugin-dir` pointed at the isolated, marketplace-installed cache folder. Nothing under
`C:/Users/<me>/.claude/` changed except the session transcripts that every `claude -p` run writes under
`projects/D--tmp-slim-claude-p-lz-oop-cli-spike/` [measured: `ls`].
