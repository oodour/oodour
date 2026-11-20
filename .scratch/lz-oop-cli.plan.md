# Plan: scripts for the plugin's deterministic steps

Lars, 2026-11-20: "Shell commands mentioned in skills and agents: Consider .ts scripts instead so that they are proven
and shell-agnostic. For example, the shell scripts look for `from '<package-or-module-name>'` but not
`import('<package-or-module-name>')`." and "All subagent and skill steps that can be done deterministically using a
script instead of prose-only should be in a script/CLI. Consider an `lz-oop` CLI (package name: `@layzee/lz-oop-cli` or
bundled with the plugin only), keeping in mind that Claude Code does support `package.json` in a distributed plugin so
we may use npm dependencies."

## Inventory (Claude, 2026-11-20, from `plugins/lz-oop/` at f4c0cf0)

Only `skills/lz-audit/SKILL.md` names shell commands; all sit in its step 2. lz-review, lz-oop and both agents only run
the project's tests, which stays the project's own command.

| Step (lz-audit 2) | Today | Gap |
| --- | --- | --- |
| Churn per file over 12 months | `git log ... \| sort \| uniq -c \| sort -rn`, POSIX only | needs a POSIX shell; renames counted by a second manual `git log --follow` per file; shallow-clone check by hand |
| Importers of a file | `rg -l "from '...'"` | misses `import()`, `require()`, `export ... from`, path aliases, package names, re-export chains (the skill admits most of it in prose) |
| Most-imported modules | `rg -o ... \| sort \| uniq -c` | relative imports only; files that share a name (`index`) share a line |
| Concrete names in churning files | prose: list imports and `new` calls | nothing runs it |
| Complexity per function | prose: run the repo's ESLint with `--rule` | each run invents its own command line |
| Quadrant per file | prose | a deterministic join of the above |

## Shape (Claude's recommendation, pending Lars on the open question)

One `lz-oop` command with subcommands that print JSON (for the agent) or a table (for a person):

- `lz-oop churn <scope>`: commits per file over a period, renames folded into the current path, a `shallow` flag.
- `lz-oop imports <scope>`: the import graph from `ts.preProcessFile`-style parsing (static, dynamic `import()`,
  `require()`, `export ... from`), resolved through the scope's `tsconfig` paths and package names; importers per file,
  production and test counted apart.
- `lz-oop concrete <file...>`: the classes a file imports and the `new` expressions it holds.
- `lz-oop hotspots <scope>`: churn, importers and a complexity measure joined, with the quadrant per file; the table
  lz-audit's report leads with.

The skill then says what each number means and how to judge it; the counting moves out of prose.

## Open question for Lars

Where the CLI lives: bundled in the plugin (`plugins/lz-oop/` with its own `package.json` and TypeScript run by Node's
type stripping) or a published package `@layzee/lz-oop-cli` the plugin depends on. Claude's recommendation: bundled,
so the scripts version with the skills that call them and need no publish step; a package later if another tool wants
them. To check before building: how Claude Code installs a plugin's `package.json` dependencies, and whether
Node.js type stripping runs from the plugin cache path.

## Bundling facts (claude-code-guide from the docs, 2026-11-20; not yet tested here)

- Claude Code installs a plugin's npm dependencies into its cached version folder (`${CLAUDE_PLUGIN_ROOT}`) on
  install, update and first load, when the root has `package.json` plus `package-lock.json` (lockfileVersion 2 or 3).
  Rules: exact registry versions, no `overrides`, `--ignore-scripts`, 60-second timeout, npm or Bun from the PATH.
  Source: code.claude.com/docs/en/plugins/loading.md, "Node.js package dependencies".
- No automatic install for a plugin loaded in place (local-path marketplace, `--plugin-dir`): eval runs and local
  development must install the dependencies themselves.
- Skills call `node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts ...`; the variable is substituted in the skill text,
  not set in the shell. Use `scripts/`, not `bin/`: claude.ai and Cowork refuse plugins with a root `bin/`.
- Node.js type stripping refuses `.ts` files only under a `node_modules` path; the plugin cache is not under one.
  Type stripping is on by default from Node.js 22.18.

Consequence for the open question: bundling works without a publish step; the only cost is the install step for
in-place runs.

## Dogfooding

Lars, 2026-11-20: "When the plugin is proven, dogfood it on this plugin's own CLI, scripts, ESLint, and Fallow
artifacts." Claude's reading: once the eval arms settle the plugin's text, run lz-audit and lz-review on the CLI,
`tools/`, `packages/eslint-plugin-lz-oop` and `packages/fallow-config-lz-oop`, and fix what they find through the
plugin, as in the audit-dogfood work on other repositories.

## Not in scope here

The complexity numbers could come from eslint-plugin-lz-oop's own rules (ABC, Flog, Halstead, cyclomatic) once that
package is published; until then `hotspots` reads the repository's own ESLint, as the skill says today.
