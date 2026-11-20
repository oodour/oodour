# Research: bundling the lz-oop CLI with the plugin

Claude (research subagent), 2026-11-20. Brief: Lars's ruling "Where the CLI lives: Bundle with plugin. Research prior
art, @claude-code-guide, the plugin-dev and skill-creator plugins, and `~/.claude/research/` for guidance." Steer from
Lars (2026-11-20, relayed verbatim): "OpenGSD's plugins have CLIs but I'm not sure the plugins or the CLIs install as a
Claude marketplace plugin. Look for Claude-native ways to bundle a CLI (or build upon bundled script guidance)".

Labels: **[sourced]** = read in a named file or doc page, or measured here; **[inferred]** = Claude's reasoning, not
checked by a run. Doc pages were fetched 2026-11-20 through markdown.new (code.claude.com blocks WebFetch).

## Claude-native options (short)

| Option | What it is | Fits lz-oop? |
| --- | --- | --- |
| A. Plugin-root `package.json` + `package-lock.json`, scripts under `scripts/`, called as `node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts ...` | Claude Code runs `npm` to install the locked dependencies into the cached version folder on install, update and first load [sourced: docs `plugins/loading.md`, "Node.js package dependencies"] | **Yes, recommended.** Works on claude.ai and Cowork too (no `bin/`) [inferred from the `bin/` restriction being the only one named] |
| B. Plugin-root `bin/` folder | Files there go on the Bash tool's `PATH` while the plugin is enabled; Claude runs them as bare commands; they come after the user's own `PATH` entries [sourced: docs `plugins/components.md`, "Executables"; `plugins-reference.md` layout table] | **No.** "claude.ai and Cowork don't install a plugin that has a top-level `bin/` directory" [sourced: same]. Also a bare `lz-oop` command would need a shebang `.ts` file, which Windows does not run [inferred] |
| C. Skill-local `skills/<skill>/scripts/` with `${CLAUDE_SKILL_DIR}` | The docs' own pattern for a skill's bundled script [sourced: docs `skills.md`, "Available string substitutions"] | Partly: fine for a script one skill owns; the CLI serves lz-audit and later lz-review, so a plugin-level `scripts/` with `${CLAUDE_PLUGIN_ROOT}` fits better [inferred] |
| D. `SessionStart` hook that runs `npm install` into `${CLAUDE_PLUGIN_DATA}` | The docs' fallback when the automatic install cannot provide a dependency (lifecycle scripts, git deps, Yarn or pnpm) [sourced: `plugins/components.md`, "Reference plugin paths and store data"; `loading.md`] | Not needed: `typescript` is a plain registry package with no dependencies and no install scripts [sourced: registry.npmjs.org/typescript/6.0.3, `dependencies` empty]. Keep as the fallback only |
| E. Separate npm package (`npx @layzee/lz-oop-cli`) | Not Claude-native; this is how classic GSD ships | Ruled out by Lars ("Bundle with plugin") |

## 1. Prior art

### Official marketplace, `anthropics/claude-plugins-official`

Local clone `D:/projects/github/anthropics/claude-plugins-official`, fetched to `origin/HEAD` d586c3f1 (2026-11-20).

- Only four plugins carry a `package.json`: `external_plugins/{discord,fakechat,imessage,telegram}` [sourced: `git
  ls-tree` at d586c3f1]. All four are MCP servers, written in TypeScript run directly by Bun, locked with **`bun.lock`**,
  caret ranges in `package.json`, and they install their own dependencies at server start:
  `"start": "bun install --no-summary 1>&2 && bun server.ts"`, launched from `.mcp.json` as
  `bun run --cwd ${CLAUDE_PLUGIN_ROOT} --shell=bun --silent start` [sourced: `external_plugins/telegram/package.json`,
  `.mcp.json`]. No tests, no `scripts/` folder. [inferred: the self-install at start is a workaround the automatic
  install now replaces]
- No official plugin bundles a CLI with npm dependencies that a skill calls [sourced: the `package.json` search above].
- Skills there grant script commands with `allowed-tools` lists such as `Bash(ls *)`, `Bash(mkdir *)` [sourced:
  `external_plugins/telegram/skills/access/SKILL.md`].

### The docs' own prior art (the strongest source)

- Skill running a bundled script without a prompt: put the same variable in the body and in an `allowed-tools` Bash
  rule: `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)` with the body "Run
  `${CLAUDE_SKILL_DIR}/scripts/render.sh <csv-file>`". "In a plugin skill, Claude Code substitutes
  `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` in the same two places." [sourced: docs `skills.md`, "Available
  string substitutions"]. Second example: `allowed-tools: Bash(python3 *)` with `python3
  ${CLAUDE_SKILL_DIR}/scripts/visualize.py .` [sourced: same page, codebase-visualizer example].
- The grant lasts only for the turn that invokes the skill; it clears at the user's next message [sourced: `skills.md`,
  "Pre-approve tools for a skill"]. Under managed `allowManagedPermissionRulesOnly` the grant is ignored [sourced:
  same].
- On Windows the substituted path uses forward slashes, `C:/Users/you/...` [sourced: `plugins/components.md`, "Reference
  plugin paths and store data"], so Git Bash does not rewrite it (no leading `/`) [inferred from the Git Bash path
  rules in global CLAUDE.md].

### GSD (OpenGSD and classic get-shit-done)

- Classic `gsd-build/get-shit-done` (clone at 2eaed7a, 2026-03-03): **separate npm installer only**. `package.json` name
  `get-shit-done-cc`, `bin` `bin/install.js`; README installs with `npx get-shit-done-cc@latest`; no
  `.claude-plugin/` [sourced: clone].
- OpenGSD `open-gsd/gsd-core` (clone at 83a26ed1, 2026-08-04): **both**. It ships `.claude-plugin/plugin.json` and
  `marketplace.json`, "enabling installation and lifecycle management via `claude plugin install|enable|disable|update
  gsd-core`", and "The plugin path is additive — the npm installer (`npx @opengsd/gsd-core`) remains fully supported"
  [sourced: `docs/FEATURES.md` line 1098, `docs/how-to/install-on-your-runtime.md` "Claude Code — native plugin
  install"]. Its CLI `gsd-core/bin/gsd-tools.cjs` (CommonJS, plain JS) ships inside the plugin tree; a `SessionStart`
  hook `gsd-ensure-canonical-path.js` symlinks `~/.claude/gsd-core/{bin,...}` to `${CLAUDE_PLUGIN_ROOT}/gsd-core/` so its
  prose can keep fixed `~/.claude/gsd-core/...` paths [sourced: `docs/ARCHITECTURE.md` line 292]. It has a
  `package-lock.json` and runtime `dependencies` with caret ranges (`@anthropic-ai/claude-agent-sdk`, `ws`) [sourced:
  clone]. Its commands find the CLI through a shell fallback chain and call `node "$GSD_TOOLS" ...` [sourced: Lars's
  installed `~/.claude/commands/gsd-discuss-phase.md` line 50]. Lars's own GSD here came from the npm installer
  (commands under `~/.claude/commands/`) [sourced: same file's path].
- `open-gsd/gsd-pi` ships through npx only (`npx @opengsd/gsd-pi@latest`), for the Pi agent, not a Claude plugin
  [sourced: clone README].
- Lesson for lz-oop [inferred]: GSD's symlink hook and shell fallback chain exist because its prose was written for
  fixed home-folder paths before the plugin route; a plugin-first CLI needs neither. Use `${CLAUDE_PLUGIN_ROOT}` in
  skill text.

### Output format

- No official source prescribes JSON for agents versus a table for people [not found]. Closest guidance: "Prefer a
  structured tool call or parameter over a custom text format the model must follow" [sourced:
  `~/.claude/research/skills-and-agents/synthesis/claude-guidance.md` rule 2.10]. GSD's `gsd-tools.cjs` returns JSON to
  its prompts [inferred from its use in commands; not read in full].

## 2. plugin-dev and skill-creator

Installed version folder for both: `~/.claude/plugins/cache/claude-plugins-official/<plugin>/db467cc56673/` (a commit,
not a tag); manifests name no repository, author Anthropic. Read from the local clone
`D:/projects/github/anthropics/claude-plugins-official` at commit db467cc5 (2026-09-22) after a `git fetch` (the clone
lacked it) [sourced].

- **plugin-dev `skill-development`**: `scripts/` holds "Executable code (Python/Bash/etc.) for tasks that require
  deterministic reliability or are repeatedly rewritten"; include one "When the same code is being rewritten repeatedly
  or deterministic reliability is needed"; benefits "Token efficient, deterministic, may be executed without loading
  into context"; scripts "Should be executable and documented"; checklist item "Test scripts: Scripts are executable and
  work correctly" [sourced: `plugins/plugin-dev/skills/skill-development/SKILL.md` lines 48-55, 223, 352-358]. No
  test-framework guidance, no npm dependency guidance.
- **plugin-dev `plugin-structure`**: a root `scripts/` folder for shared utility scripts; "Always use
  `${CLAUDE_PLUGIN_ROOT}`"; "Test on multiple systems: Verify on macOS, Linux, Windows"; "Document dependencies";
  kebab-case script names [sourced: `skills/plugin-structure/SKILL.md` lines 36, 258-300, 324, 392-394].
  `references/component-patterns.md` "Script Organization Patterns": flat `scripts/` for 5-10 related scripts,
  categorized subfolders for 10+, per-language folders when dependencies differ [sourced: lines 381-446].
- **plugin-dev `command-development`** reference shows `allowed-tools: Bash(node:*)` with
  ``!`node ${CLAUDE_PLUGIN_ROOT}/scripts/analyze.js` `` and also a `${CLAUDE_PLUGIN_ROOT}/bin/lint.js` example [sourced:
  `skills/command-development/references/plugin-features-reference.md` lines 93-119]. Conflict: the `bin/` example
  predates the docs' claude.ai/Cowork restriction; and `Bash(node:*)` is the old colon syntax and grants every `node`
  command [inferred].
- **plugin-dev `hook-development`**: test hook scripts by piping sample JSON (`scripts/test-hook.sh`), lint them,
  `claude --debug` [sourced: `skills/hook-development/SKILL.md` lines 610-709, `scripts/README.md`]. All Bash.
- **skill-creator**: `scripts/` is "Executable code for deterministic/repetitive tasks"; bundled resources load "As
  needed (unlimited, scripts can execute without loading)" [sourced: `plugins/skill-creator/skills/skill-creator/SKILL.md`
  lines 81, 91]. The signal to bundle: when the subagents of every test run each wrote a similar script, write it once,
  put it in `scripts/`, and tell the skill to use it [sourced: line 304]. For assertions that code can check, "write and
  run a script rather than eyeballing it" [sourced: line 225]. Its own scripts are Python, run as
  `python -m scripts.<name>` from the skill folder, with no tests in the tree [sourced: file list at db467cc5].
- Neither plugin mentions `package.json` dependencies, the automatic install, `${CLAUDE_PLUGIN_DATA}` or TypeScript
  [sourced: `rg` over the files above].

## 3. `~/.claude/research/` and `lars-skill-authoring.md`

- `skills-and-agents/synthesis/claude-guidance.md` rule 1.7: "Scripts belong in the skill for anything deterministic or
  rewritten every run. 'Code is deterministic; language interpretation isn't.' ... Put `${CLAUDE_SKILL_DIR}` in both the
  body and an `allowed-tools` Bash rule so the script runs without a prompt." Rule 2.1: describe outcomes, not steps,
  but step-exact commands "remain right for scripts and deterministic checks". Open question 13: no source covers Git
  Bash versus PowerShell for scripts [sourced].
- `notes/skills/lessons-from-building-claude-code-how-we-use-skills.md`: store scripts and libraries so Claude "spend[s]
  its turns on composition"; verification skills should include scripts [sourced].
- `notes/skills/complete-guide-to-building-skills-for-claude.md`: "For critical validations, consider bundling a script"
  [sourced].
- `placement-audit-2026-10-01.md` and `skill-doctor-2026-11-14.txt`: nothing on bundled scripts [sourced: `rg -i
  script` hits are unrelated].
- **The bar** (`~/.claude/references/lars-skill-authoring.md` lines 52-73): every script a skill uses is TypeScript in
  erasable syntax only (`erasableSyntaxOnly`), run directly by Node.js 22 and 24, with `node:test` tests in a `.test.ts`
  file of the same syntax run on both versions; type-checked, test-covered, code-reviewed, security-reviewed, passed
  through `/deslop` before anything points at it, ideally mutation-tested [sourced]. This repo's `AGENTS.md` applies the
  same bar to its hooks, mod and tools [sourced].
- Windows and Git Bash, from global CLAUDE.md [sourced]: Git Bash rewrites an argument starting with `/`; quote Windows
  paths; never `/dev/stdin` as a path; multi-line input through a file. A `.ts` CLI that takes paths as arguments and
  reads files itself avoids all of these; the `sort`/`uniq` pipelines are what lz-audit step 2 needs a POSIX shell for
  today [inferred].

## 4. Bundling facts checked against the docs

| Brief's fact | Docs say | Verdict |
| --- | --- | --- |
| Install into the plugin cache from `package.json` + `package-lock.json` (lockfile v2/3) | Yes, into "the copied version directory each time it creates one": install, update, session start when not cached. Needs both files at the plugin root; npm lockfile `lockfileVersion` 2 or 3; `bun.lock` wins if present; npm-source plugins need `npm-shrinkwrap.json` [sourced: `loading.md`] | Confirmed |
| Exact versions | "every dependency must be a registry package pinned **in the lockfile** to an exact version"; git, folder, workspace or linked deps get no install [sourced] | Nuance: the lockfile pins; `package.json` ranges are allowed (gsd-core uses carets). Pin exact in `package.json` anyway, as this repo's root does [inferred] |
| `--ignore-scripts` | Yes [sourced] | Confirmed |
| 60 s timeout | Yes, a longer install "is treated as failed" [sourced] | Confirmed. `typescript@6.0.3` is 24.3 MB unpacked, 140 files, no deps [sourced: registry] |
| No install for in-place / `--plugin-dir` | `--plugin-dir` and skills-directory plugins load in place; relative-path plugins in a marketplace added from a **local path** load in place and "Claude Code doesn't install the dependencies into the source directory" [sourced: `loading.md`] | Confirmed |
| `${CLAUDE_PLUGIN_DATA}` persists across updates | `~/.claude/plugins/data/<id>/`, "for `node_modules`, virtual environments, and caches", kept across updates, deleted on last uninstall [sourced: `components.md`, `loading.md`] | Confirmed |
| Avoid a root `bin/` | Confirmed [sourced: `components.md`, `plugins-reference.md`] | Confirmed |
| (not in brief) | "Frozen resolution ... skips it when `package.json` and the lockfile don't list the same dependencies"; `overrides` blocks the install; the install runs in a separate folder that ignores the plugin's `.npmrc`; failure leaves the plugin loaded with a note in `/plugin` and `claude plugin list`; retry with `claude plugin update`; "You can't turn the automatic install off" [sourced: `loading.md`, `plugins/troubleshooting.md`] | New |
| (not in brief) | `claude plugin eval <path>` loads the plugin from that path (in place) [sourced: `plugin-evals.md`, target table]. Granting Bash makes every command run under the OS sandbox; "Native Windows has no backend, so run shell-granting suites under WSL2" [sourced: same, "Shell grants need a sandbox"] | New, and it matters for evals that run the CLI |
| (not in brief) | Does the install include `devDependencies`? | Not found in the docs. Keep the plugin's `package.json` to runtime `dependencies` only [inferred] |
| Node type stripping off under `node_modules` only | Not in Claude docs; Node behaviour. Local Node is v24.22.0 [sourced: `node --version`] | Unchanged from the plan; cache path `~/.claude/plugins/cache/...` has no `node_modules` segment [inferred] |

## Recommended layout for lz-oop

All of this is [inferred] from the sources above unless marked.

```text
plugins/lz-oop/
|-- .claude-plugin/plugin.json
|-- package.json          # runtime dependencies only
|-- package-lock.json     # lockfileVersion 3, committed
|-- scripts/
|   |-- lz-oop.ts         # entry: argument parsing, dispatch to subcommands
|   |-- churn.ts
|   |-- churn.test.ts
|   |-- imports.ts
|   |-- imports.test.ts
|   '-- ...
|-- skills/lz-audit/SKILL.md
'-- ...
```

- **Folder**: plugin-level `scripts/` (not `bin/`, not per-skill), flat while there are under about ten files
  (plugin-dev's pattern). Tests sit beside the code as `*.test.ts`. They ship with the plugin; that is the cost of the
  flat layout (a few KB). If shipping tests is unwanted, put them in a repo folder outside `plugins/lz-oop/` instead.
- **package.json** (plugin root): `"private": true`, `"type": "module"`, `"engines": { "node": ">=22.18" }`, and
  `"dependencies": { "typescript": "6.0.3" }` with the exact version the root `package.json` already pins [sourced:
  root `package.json` has `typescript` 6.0.3]. No `devDependencies`, `scripts`, `overrides` or `bin`. A check in
  `tooling` should fail the build when the plugin's `typescript` pin and the root's differ (one truth).
- **Lockfile**: `npm install --package-lock-only` in `plugins/lz-oop/`, commit `package-lock.json`. The repo's
  `.gitignore` already ignores nested `node_modules/` [sourced: `.gitignore` line 2].
- **How skills call it**: body text "Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts hotspots <scope>`" and
  frontmatter `allowed-tools: Read(${CLAUDE_PLUGIN_ROOT}/**) Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts *)`
  (lz-audit already has the Read rule [sourced: its frontmatter]). Same command shape in Bash and PowerShell; the path
  substitutes with forward slashes on Windows [sourced]. Caveats: the grant lasts one turn [sourced]; whether it
  carries into the `lz-oop:auditor` subagent that preloads the skill through `skills:` is not documented, so test it in
  an eval [not found]. A user profile path with a space would split the command; quoting it in the body
  (`node "${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts"`) must then still match the rule; check this in the spike.
- **Output**: JSON on stdout by default for the agent (the skills are the only caller), `--format table` for a person;
  errors on stderr with a non-zero exit.
- **Tests under Nx**: extend the `tooling` project's existing targets rather than add a project, matching how `tools/`
  is covered today [sourced: `project.json` targets]: add `plugins/lz-oop/scripts/**/*` to `namedInputs.default`, add
  `"plugins/lz-oop/scripts/*.test.ts"` to `test` and `test:stryker`, and add the folder to the `tsc -p tsconfig.json`
  include and to ESLint's scope. Alternative: give the `lz-oop` project (inferred by `tools/nx/claude-plugin.ts`)
  `typecheck`, `lint` and `test` targets for its scripts; that keeps the plugin's code with its project, at the cost of
  changing the inference plugin. Run on Node 22 and 24 per the bar.
- **Dependencies in local and eval runs (in place, no automatic install)**: a script under `plugins/lz-oop/scripts/`
  resolves `typescript` by walking up to the repository root's `node_modules`, which already holds 6.0.3, so
  development and `claude plugin eval dist/eval/lz-oop` (also inside the repo) work without an install. That same
  walk-up hides a missing or mismatched plugin dependency, so add one check that runs the CLI from a copy outside the
  repository after `npm ci --ignore-scripts` in that copy, which is what a marketplace install does. Shell-granting eval
  cases need a sandbox, which native Windows lacks, so run those under WSL2 [sourced for the sandbox limit].
- **Fallback**: if the automatic install ever proves insufficient, add the docs' `SessionStart` hook that installs into
  `${CLAUDE_PLUGIN_DATA}` and point `NODE_PATH` there [sourced: `components.md`]. Not needed for `typescript`.

## Not checked

- No run yet of a marketplace install of a plugin with a `package.json` on this machine, nor of the `allowed-tools`
  rule matching a substituted Windows path, nor of the grant inside a subagent. These are the riskiest unknowns; a spike
  plugin with one `scripts/x.ts` that imports `typescript` would settle all three.
- Whether Nx infers a new project from `plugins/lz-oop/package.json` (the root `package.json` has no `workspaces`, so
  probably not) [inferred, check with `nx show projects`].
