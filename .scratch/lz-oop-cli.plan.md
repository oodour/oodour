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

## Design, 2026-11-23 (Claude's, after Lars's "Where the CLI lives: Bundle with plugin")

pstack:architect in the main context, two candidates, no arena (lars-principle-cap-fan-out: a mid-size design with
the shape already researched; the one contested point, the complexity source, is settled by measurement below).

### Usage (caller's view)

lz-audit step 2 runs one command and reads one table:

```text
node ${CLAUDE_PLUGIN_ROOT}/scripts/lz-oop.ts hotspots <scope> [--since "12 months ago"] [--limit 30]
```

It prints a Markdown table the report can lead with, above a few lines that state the period, whether the history is
shallow, the thresholds each axis used and what was left out. One row per production file: commits in the period
(renames folded into the current path), dependents (production and test, counted through files that re-export it),
the largest function complexity, concrete classes it names, and the quadrant. Rows: every file in the two quadrants
to audit first, then the rest by churn, up to `--limit`.

### Shape

Candidate A (the plan's four subcommands `churn`, `imports`, `concrete`, `hotspots`): four public commands, and the
skill coordinates them, so it learns each one's output and joins them itself, which is the prose this replaces.
Candidate B (one `hotspots` command over internal modules): one command hides the git parsing, module resolution,
complexity count and the join. B wins on interface depth and keeps one way to get the table. Rejected from A: the
separate commands. Kept from A: one module per measure, each with its own tests.

Modules in `plugins/lz-oop/scripts/`:

- `lz-oop.ts`: arguments (`node:util` `parseArgs`), runs `hotspots`, prints; usage and exit 2 on bad arguments.
- `files.ts`: JS/TS files in scope (`git ls-files`, else a folder walk without `node_modules`), and which are tests
  (`*.test.*`, `*.spec.*`, `__tests__/`).
- `churn.ts`: one `git log --name-status -M` over the whole history in the period, renames folded newest-first into
  the current path; the shallow flag; no repository means no churn column.
- `modules.ts`: one TypeScript parse per file: imports (static, `import()`, `require()`, `export ... from`) resolved
  with `ts.resolveModuleName` and the nearest `tsconfig.json` (paths, package names through symlinks), whether the
  file only re-exports, the concrete classes it exports and the classes it names (imports and `new`).
- `complexity.ts`: ESLint's own `complexity` rule through `Linter` with `@typescript-eslint/parser`, as
  `lz-oop-test-metrics` counts it, so the number is the lint rule's by construction. No repository config runs.
- `hotspots.ts`: the join, the thresholds, the quadrant and the table.

Quadrants follow lz-audit step 2: often changed and complex; many dependents and either often changed or holding a
concrete class; complex but unchanged; simple. "Often changed" is at least the 75th percentile of commits among
production files with a commit, and at least 2; "complex" is at least the 75th percentile of largest-function
complexity, and above 4 (the plugin's `complexity` limit); "many dependents" is a tenth or more of the production files
in scope, the skill's own cut. Re-export-only files are left out of the rows.

Dependencies (plugin `package.json`, exact pins equal to the root's, lockfile committed): `typescript` 6.0.3,
`eslint` 10.13.0, `@typescript-eslint/parser` 8.72.1. Measured 2026-11-23: 92 packages, installed in 2 s with a warm
npm cache (Claude Code's limit is 60 s; cold not measured).

Nx: the inferred `lz-oop` project gains `typecheck`, `lint` and `test` targets when the plugin has a `scripts/`
folder, so the plugin's code is checked with its project; `tooling`'s lint leaves `plugins/` out.

### Tradeoffs accepted

- The complexity count copies about 40 lines of `lz-oop-test-metrics` (the plugin ships alone and cannot import an
  unpublished package), in exchange for the lint rule's number by construction. Price of one copy: a shared package
  once either is published.
- ESLint is a plugin dependency (install size) in exchange for no hand-written counter and no run of the audited
  repository's ESLint config, which would execute its code.
- Percentile thresholds are relative to the scope, in exchange for a quadrant that works on any repository; the table
  prints them so the report can say so.

### Next implementation step

`files.ts` and `churn.ts` test-first against a temporary Git repository.

## Dogfooding

Lars, 2026-11-20: "When the plugin is proven, dogfood it on this plugin's own CLI, scripts, ESLint, and Fallow
artifacts." Claude's reading: once the eval arms settle the plugin's text, run lz-audit and lz-review on the CLI,
`tools/`, `packages/eslint-plugin-lz-oop` and `packages/fallow-config-lz-oop`, and fix what they find through the
plugin, as in the audit-dogfood work on other repositories.

## Not in scope here

The complexity numbers could come from eslint-plugin-lz-oop's own rules (ABC, Flog, Halstead, cyclomatic) once that
package is published; until then `hotspots` reads the repository's own ESLint, as the skill says today.
