# AGENTS.md

Agent-agnostic rules for this repository. `CLAUDE.md` imports this file.

This repository will hold OOdour (`oodour`), a Claude Code marketplace plugin that helps people design
object-oriented code the way Sandi Metz teaches it. It was named lz-oop until 2026-11-26 (Lars: "The name is
"OOdour", not "Oodour", "OO" as in "OOP"."); quotes from before then keep the old name. Prose writes OOdour; package,
file, skill and agent names write `oodour`, and the npm scope is `@oodour`. Its research draws on her copyrighted book,
talks and articles, held locally in full text behind a firewall. The firewall is the most
important rule here.

## Oracle firewall

`.oracle/` holds the full text of copyrighted works: Sandi Metz, Katrina Owen and TJ Stankus,
*99 Bottles of OOP*, 2nd edition, JavaScript, and its companion code; transcripts of Sandi Metz
talks; and her articles and example code.
It is git-ignored and must stay that way.

The plugin must be original work. Text an agent has read shapes the text it then writes, so
copyrighted wording that reaches your context can leak into skills, references, commit messages
and published writing through ordinary paraphrase drift. The firewall keeps the source inside
dedicated agents whose output is checked to never carry it back out.

### The one rule

> **The sources' expression must not enter your context or leave your output, by any route, from
> any source, including your own memory.**

Everything below applies that rule. When a situation is not covered here, decide by the rule.

### The tier

Every entry in the store is **sealed**: you may not open its text. Reach it only through the
oracle agents. A source gets a row here in the same change that admits it.

| Entry | Path | Tier |
| --- | --- | --- |
| Metz, Owen and Stankus, *99 Bottles of OOP*, 2nd edition, JavaScript | `.oracle/99-bottles-2e-js/` | Sealed |
| Sandi Metz talk transcripts (30 talks, interviews, podcasts and Q&A sessions, 2009 to 2022) | `.oracle/metz-talks/` | Sealed |
| Sandi Metz articles, blog posts, and her public example-code repositories | `.oracle/metz-written/` | Sealed |
| The book's companion code, `sandimetz/99bottles_js`, as a full git clone | `.oracle/99bottles-js/` | Sealed |
| Katrina Owen talk transcripts (3 talks, 2012, 2014 and 2016) | `.oracle/owen-talks/` | Sealed |
| Sandi Metz, *Practical Object-Oriented Design*, 2nd edition (2018) | `.oracle/poodr-2e/` | Sealed |
| Martin Fowler, *Refactoring*, 2nd edition (2018) | `.oracle/fowler-refactoring-2e/` | Sealed |
| Gerard Meszaros, *xUnit Test Patterns* (2007) | `.oracle/meszaros-xunit-test-patterns/` | Sealed |
| Joshua Kerievsky, *Refactoring to Patterns* (2004) | `.oracle/kerievsky-refactoring-to-patterns/` | Sealed |
| Gamma, Helm, Johnson and Vlissides, *Design Patterns* (1994) | `.oracle/gamma-design-patterns/` | Sealed |
| Public articles and papers the Metz corpus cites: Robert C. Martin (2000), five martinfowler.com pages, Feathers (2011) | `.oracle/metz-cited-articles/` | Sealed |
| Kent Beck's essays and blog archive (the two book files are short summaries, not the books) | `.oracle/beck-writing/` | Sealed |
| Rebecca Wirfs-Brock and Alan McKean, *Object Design* (2002) | `.oracle/wirfs-brock-object-design/` | Sealed |
| Reginald Braithwaite, *JavaScript Allongé*, the "Six" edition | `.oracle/braithwaite-javascript-allonge-six/` | Sealed |
| Axel Rauschmayer, *Exploring JavaScript*, ES2025 edition (2025) | `.oracle/rauschmayer-javascript/` | Sealed |
| Martin Fowler's JavaScript refactoring articles (2015, 2016) | `.oracle/fowler-js-articles/` | Sealed |
| MDN JavaScript class pages and TypeScript Handbook pages (classes, mixins, narrowing, `satisfies`) | `.oracle/js-ts-language-reference/` | Sealed |
| The book's Ruby companion code, `sandimetz/99bottles_ruby`, as a full git clone | `.oracle/99bottles-ruby/` | Sealed |

### What you need, and the permitted route

Every ban comes with the route that answers the same need. If you cannot name a route for a new
ban, ask Lars instead of shipping the ban.

| You need | Do not | Do |
| --- | --- | --- |
| An answer from a source | Read, search, print, or fetch its text, from the store or the web | Ask the `oracle` agent: a question plus one entry's `index.md` path, passed as a string |
| A drafted document checked against a source | Check it yourself from memory | Run `oracle-reviewer` with the draft paths and one entry's index path |
| To know which works exist | List or glob the store | Read `.oracle/README.md`, the one file outside the agents you may open |
| To know whether a text copies a source | Compare by hand | `node tools/source-overlap.ts <file>` (prints positions, never text) |
| A source added or fixed | Write into `.oracle/` | Brief the `oracle-curator` agent, or ask Lars to run the command with `!` |
| To search the repository | Run an unscoped `find`, `ls -R`, `Get-ChildItem -Recurse` or `tree` from the root | Scope the search to the directory you mean |
| To search for the string `.oracle` | Pass it in a shell command | Use the Grep tool with a path outside the store |

If you find source text anywhere outside `.oracle/` (a draft, a scratch file, a prior session's
output), stop reading it, do not use it, and tell Lars.

### What you write

- Never write a source's chapter or section heading, a definition's wording, example code, a
  memorable line, or an anecdote. Names of principles, rules, refactorings, smells and patterns
  are free: Shameless Green, the Flocking Rules, the Law of Demeter.
- In research notes and plans, cite as the oracles do: `Ch.<n> (<your own words>)` for the book, the
  talk or article title with its year for the others. Never derive a chapter number from a file name.
- In the distributed plugin's skills, references and agents (`plugins/oodour/`), cite no source: no chapter number,
  no title of a book, talk or article, no stand-in such as "the book" or "the talk", and no "her" or "she" for an
  author. Name the pattern, principle or practice, state its meaning, intent and steps in your own words, and have
  `oracle-reviewer` gate the result. The works are credited once, in `plugins/oodour/ATTRIBUTION.md`; add a work
  there in the same change that first draws on it. Leave out sources-and-attribution sections, statements of where
  the plugin's reading comes from, claims about material the plugin cannot read, and asides that give the agent
  nothing to act on (Lars, 2026-11-15: "Ideally, it shouldn't be necessary for the distributed skill or reference
  documents to mention the Chapter number since it adds no value to consumers that don't have the oracle or book
  available."; Lars, 2026-11-19: "The distributed parts of the skills shouldn't mention titles of books, talks,
  articles, or other sources. A separate license-like/attribution document distributed with the plugin, sure, but I
  don't think we should waste tokens on mentioning titles of sources over and over again." and "No *Sources and
  attribution* or similar directly in SKILL.md and references."). Person names stay out too: the
  names A/B of 2026-11-25 (`.scratch/names-ab-2026-11-25.md`) found no practical difference on Sonnet or Opus, and
  Lars ruled that day: "If measured differences are within the noise, default to no-names (except for named patterns,
  refactorings, smells, and so on, as agreed)".
- Every claim you attribute to Sandi Metz must come from an oracle answer, not from memory, and
  you must mark what is your inference.
- For a JavaScript or TypeScript form, *99 Bottles of OOP* and its JavaScript companion code decide first, then
  any other Metz or Owen source written in JS/TS, then Fowler's *Refactoring*, 2nd edition (Lars,
  2026-11-16: "99 Bottles is *the* authorative source on JS/TS as well as any other Metz/Owen source
  using JS/TS, with Fowler's Reactoring 2e in a close second."). The other JavaScript and TypeScript
  entries in the tier table come after these, equal among themselves (Claude's ordering, 2026-11-16, under that
  ruling; Lars has not ruled on it). Every JS/TS choice that does not come
  straight from Metz or Owen (this plugin's own idiom, a form taken from Fowler, a translation of a
  Ruby idiom) must still comply with their principles, patterns and practices: gate it with
  `oracle-reviewer` on a Metz or Owen entry, not only on the entry it came from (Lars, 2026-11-16:
  "The important point is that any JS/TS choices not directly from Metz/Owens should comply with
  their principles, patterns, and practices, including JS/TS choices rooted in Fowler's Refactoring
  2e.").
- The plugin may use a language feature or API that is a TC39 proposal TypeScript supports today, Widely Available
  in Web Platform Baseline, or available in the latest major Node.js LTS version (Lars, 2026-11-16: "lz-oop may use a
  TC39 proposal that works with TypeScript today or is Widely Available per Web Platform Baseline", then "...or
  available in the latest major Node.js LTS version"). Claude's reading: TypeScript supports a proposal when it
  compiles the syntax or ships the API's types; a feature allowed on one ground only still needs a runtime that has
  it, so say which runtimes lack it. Check status in the `web-platform-dx/web-features` data and the latest LTS line
  of `https://nodejs.org/dist/index.json`, not from memory.
- Run `node tools/source-overlap.ts <file>` on any prose you wrote from an oracle answer before you
  commit it.

### Enforcement

Three layers back the prose, and none of them replaces it.

- The `oracle-guard` mod (`.claude/mods/oracle-guard/`, on `tool.call`) denies any tool call that
  names a store path, except from the oracle agents, the `.oracle/README.md` listing,
  `tools/source-overlap.ts` and `tools/store-check.ts`. It denies the call when its own check fails.
  `.claude/hooks/oracle-guard.ts` makes the same decision as a command hook, kept for sessions
  without the mod engine; `.claude/settings.json` no longer runs it on every call.
- `.claude/hooks/oracle-hand-back.ts` (PreToolUse on `SubagentHandback`, and SubagentStop) sends
  an oracle agent back to rewrite its report while it shares a run of six or more words with the
  store, so the copy never reaches you.
- The `oracle-scrub` mod (`.claude/mods/`) removes store paths from Glob and Grep results that did
  not aim at the store, and withholds shell output that lists them.

What each layer misses, and the detailed reading, writing and citing rules:
[`references/oracle-firewall.md`](references/oracle-firewall.md). The store's layout, how to
admit a source, and the record of what was imported and left out:
[`references/oracle-store.md`](references/oracle-store.md). Which of Lars's skills, pstack and
lz-tdd to use for oracle work, and what each must not do near the store:
[`references/agent-workflow.md`](references/agent-workflow.md).

The hooks, the mod and the tools meet the script bar in `~/.claude/references/lars-skill-authoring.md`
(Lars, 2026-11-15: "Claude mod and hook scripts should meet the same bar as those I require for user-scope
skill scripts"): erasable-syntax TypeScript with `.test.ts` tests on Node.js 22 and 24. `npm run check`
type-checks, lints and tests all of them.

## Words and decisions

- `GLOSSARY.md` defines the repository's own words (coach, review, audit, finding, cure, remedy, stop-and-look message,
  tier, store, sealed and the rest). Use them in code, docs, tests and commit messages, and not the words a term lists
  under _Avoid_. Change a term in the same commit as the change that needs it. The glossary defines words only;
  behaviour belongs in the skills, the references and the package READMEs.
- `docs/adr/` records the decisions that are hard to reverse, surprising without context and the result of a real
  trade-off, one numbered file each. Read the ADRs that cover a change before committing it; when the change reverses
  one, add an update to it or a new ADR that supersedes it.
- [`references/glossary-and-adrs.md`](references/glossary-and-adrs.md) says when each of them changes and how to write
  the change.

## The plugin's skills and agents

- The plugin stands alone: its shipped files (`plugins/oodour/`) name none of the maintainer's own plugins or skills.
  Describe an idea in its own words instead of pointing at another tool, and credit people and their works, not tools.
- Every concept a rule's message names, every rule and every Fallow check traces to the sources, and code metrics
  count as traced ([ADR 0003](docs/adr/0003-every-concept-rule-and-check-traces-to-the-sources.md)).
- No skill sets `disable-model-invocation: true`. In Claude Code it also makes the Skill tool refuse the skill,
  stops `skills:` preloading, and keeps `/loop` and autonomous sessions from running it.
- Name plugin agents with the plugin prefix wherever a caller names them (`skills: [oodour:oodour-review]`,
  `subagent_type: "oodour:reviewer"`). A bare name silently falls back to the default agent in a skill's `agent:`
  field, and fails in an Agent call.
- Point at bundled files with `${CLAUDE_SKILL_DIR}` inside a skill and `${CLAUDE_PLUGIN_ROOT}` across skills.
- Verify a change to a skill or agent with a real run, the eval suite below, after Lars's go-ahead for the round.
  Judge from the subagent's transcript what it received, not from the model's answer.
- The plugin officially supports Opus 5.5 and Sonnet 5.5, the models the evals cover (Lars, 2026-11-25: "Official
  support (covered by evals) only for Opus 5.5 and Sonnet 5.5").
- The plugin, its skills and its agents follow the model-specific guidelines for the supported models and the general
  Claude model guidelines in `~/.claude/research/`; where two sources conflict, the newer date and the newer model
  generation win. The plugin-dev and skill-creator plugins' plugin and skill guidelines apply too, but recent research
  outranks them where they conflict (Lars, 2026-11-25).
- The reviewer and auditor agents have no `tools` list, so they keep every tool, Write, Edit, Bash and PowerShell
  included: they write and run verification scripts and findings files. A tools allowlist would not make them
  read-only anyway, because Bash can still write. This wins over the guideline that limits a subagent to its role's
  tools (Lars, 2026-11-25: "If they had Write/Edit/Bash/PowerShell tool access, that was intentional. Although they are
  reviewers, it is useful to them to be able to write and run verification scripts."; the evidence is the review of
  `LayZeeDK/thermos-claude-plugin` pull request 1, where 117 of 155 reviewer runs used Write or Edit for findings files
  and scratch verification scripts, never on the code under review).
- The review and audit collect OOdour's metrics and smells through the published OOdour ESLint and Fallow packages,
  which the skills offer to install and set up for the session or for good; until those packages are published, evals
  and slim `claude -p` runs use builds packed from `packages/` (Lars, 2026-11-25: "Wait for lz-oop ESLint/Fallow
  packages to be published. The skills offer to install and set up the published lz-oop packages temporarily or
  permanently. We create temporary builds/packages/tarballs for evals and slim `claude -p` runs until the packages have
  been published."). Adopted the same day after a trial: the metric logic moves into a core package without ESLint, which
  the ESLint rules and the plugin's own command (`hotspots` and a measuring command) both use, so the review and audit
  measure with no install step; an untrusted audit uses only the metrics that need no type information, and Fallow is
  not bundled (Lars, 2026-11-25: "1-2: OK, let's try that and see how it works out, then re-evaluate."; then, to
  Claude's recommendation to keep the core and start building it: "1-2: OK"). The skills still
  offer the published packages for a team's own lint setup. The layout: a core package (`@oodour/core`); a CLI package
  (`@oodour/cli`) on top of it, holding `hotspots` and the measuring command; the plugin depends on the CLI package from
  the registry through a thin `scripts/oodour.ts` that keeps the command line the skills pre-approve and the trust gate
  reads; the ESLint package and `@oodour/test-metrics` use the core too (Lars, 2026-11-25, proposing it: "We could ship an `lz-oop` CLI in
  a separate package which could be used by the `lz-oop` Claude plugin and ship a separate `lz-oop` core package which
  could be used by the CLI and the ESLint/Fallow packages"; then "Adopt the three-package layout: OK"). It replaces the
  earlier ruling that bundled the command in the plugin.

## Nx workspace

The repository is an Nx workspace with six projects: `tooling` (the hooks, the mod and the tools, from
`project.json`), `oodour` (the plugin, inferred by `tools/nx/claude-plugin.ts` from its manifest), and the four
packages `core`, `eslint-plugin`, `fallow-config` and `test-metrics` (each from its `project.json` under `packages/`,
published as `@oodour/<name>`). Run Nx as `npm exec -- nx`.

- The packages are npm workspaces of the root `package.json`, so `npm install` links each into `node_modules/@oodour/`.
  A package that others import (the core) lists its source under the `@oodour/source` export condition, which the root
  `tsconfig.json` sets as a custom condition; run Node.js with `--conditions=@oodour/source` to test against the source
  without a build. Without the condition, an import resolves to the package's `dist/`, as a registry install does.
- `npm exec -- nx run-many -t pack` writes the core, ESLint and Fallow packages as tarballs to `dist/packages/`, for
  evals and slim `claude -p` runs until the packages are published. The core's and the ESLint package's `pack` run
  their `build` first, because Node.js strips no types under `node_modules`, so an installed package must ship
  JavaScript.

- `npm run check` runs `nx run-many -t typecheck lint test test-mods validate overlap citations`, then
  `nx format:check --all`. `citations` fails when the distributed plugin cites a chapter number, a title that
  `plugins/oodour/ATTRIBUTION.md` lists (two words or more), a stand-in such as "the book", or "her" or "she" (see "What
  you write").
- CI (`.github/workflows/ci.yml`) runs the same targets with `--configuration=ci` and without `overlap`. A clean clone
  has no store and none of the declarations a Claude Code session writes beside each mod, so the tooling targets' `ci`
  configuration skips the one test that reads the store and leaves the mods' `hooks/` out of type-check and lint. Those
  run locally only. `.github/workflows/mutation.yml` runs each Stryker configuration as its own job on every push.
- Prettier formats the distributed plugin's Markdown only, wrapping prose at the 120 columns `.editorconfig` sets for
  it; `.prettierignore` keeps the rest of the repository out for now. Fix a failing format check with
  `npm exec -- nx format:write --all`. The Prettier version range and the base `.editorconfig`, `.prettierrc` and
  `.prettierignore` follow what Nx 24.0.6 generates for a new workspace (Lars, 2026-11-16: "align EditorConfig and
  Prettier configs with Nx defaults"; "~3.6.2 it is").
- `npm exec -- nx run oodour:eval -- <claude plugin eval options>` runs the eval suite. Its `pre-eval` step copies
  the plugin and `evals/oodour/` into `dist/eval/oodour/`, because `claude plugin eval` reads cases only below a
  plugin root and the cases stay out of the distributed plugin. It passes `--allow-tools Write Edit`, because the eval
  withholds those tools unless the run grants them; a case still gets only the tools its `allowed_tools` lists, and
  audit-own-change is the one that lists them. `nx run oodour:eval-real` does the same for the
  real-repository cases in `evals/oodour-real/`, whose scaffold scripts unpack a pinned commit of a local clone, and
  passes `--scaffold` so those scripts run. Every eval round waits for Lars's go-ahead (Lars,
  2026-11-15: "block on me before each round of runs so that I may check remaining token budget in our Claude
  plan"). A round covers Opus at 3 runs a case and Sonnet at 5 (Lars, 2026-11-25: "Our evals should cover Opus at n=3
  and Sonnet at n=5. If skills work in Sonnet, they usually also work in Opus."): `--model claude-opus-5-5 --runs 3`
  and `--model claude-sonnet-5-5 --runs 5`.
- `test` and `overlap` are never cached: both read the git-ignored store, which Nx cannot hash.
- After editing `tools/nx/claude-plugin.ts`, run `npm exec -- nx daemon --stop`. The daemon keeps the plugin it loaded
  and serves the old inferred `oodour` targets until it restarts; the next Nx command starts a fresh one.
- Never set `NX_DAEMON=false` or pass `--skip-nx-cache` (Lars, 2026-11-15: "this Nx workspace may never use
  `NX_DAEMON=false` or `--skip-nx-cache` which is always a smell indicating a misconfigured workspace or
  environment"). Fix the configuration instead.
- Avoid adding environment variables of the repository's own. When one is needed, prefix a public one (a plugin user
  may set it) with `OODOUR_` and an internal one (tests, tooling) with `_OODOUR_INTERNAL_` (Lars, 2026-11-24, before
  the rename: "Keep in mind that env variables for internal use should be prexifed with `_LZ_OOP_INTERNAL_`" and
  "Public env variables should be prefixed with `LZ_OOP_` but generally avoid custom env variables").
- `_OODOUR_INTERNAL_TEST_TEMP` moves the scripts' test temporary folders, for instance to a Dev Drive. Nx loads it
  from a git-ignored `.env.local` at the workspace root; `TEMP` itself cannot go there, as Nx never lets an env file
  replace a variable the shell already set. Lars chose this over a user-level `TEMP` and a per-run `--env.TEMP=`
  (2026-11-24: "1: Option A"). A `TEMP` inside the workspace fails the tests that need a folder outside any repository.
