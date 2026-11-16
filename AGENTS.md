# AGENTS.md

Agent-agnostic rules for this repository. `CLAUDE.md` imports this file.

This repository will hold `lz-oop`, a Claude Code marketplace plugin that helps people design
object-oriented code the way Sandi Metz teaches it. Its research draws on her copyrighted book,
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
| Sandi Metz talk transcripts (28 talks, interviews, podcasts and Q&A sessions, 2009 to 2022) | `.oracle/metz-talks/` | Sealed |
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
- In the distributed plugin (`plugins/lz-oop/`), never cite a chapter number: a reader without the book
  gains nothing from it. Name the pattern, principle or practice, state its meaning, intent and steps
  in your own words, credit the book by title, and have `oracle-reviewer` gate the result. Talks and
  articles keep their title and year (Lars, 2026-11-15: "Ideally, it shouldn't be necessary for the
  distributed skill or reference documents to mention the Chapter number since it adds no value to
  consumers that don't have the oracle or book available.").
- Every claim you attribute to Sandi Metz must come from an oracle answer, not from memory, and
  you must mark what is your inference.
- For a JavaScript or TypeScript form, *99 Bottles of OOP* and its JavaScript companion code decide first, then
  any other Metz or Owen source written in JS/TS, then Fowler's *Refactoring*, 2nd edition, then the other
  JavaScript and TypeScript entries in the tier table (Lars,
  2026-11-16: "99 Bottles is *the* authorative source on JS/TS as well as any other Metz/Owen source
  using JS/TS, with Fowler's Reactoring 2e in a close second."). Every JS/TS choice that does not come
  straight from Metz or Owen (this plugin's own idiom, a form taken from Fowler, a translation of a
  Ruby idiom) must still comply with their principles, patterns and practices: gate it with
  `oracle-reviewer` on a Metz or Owen entry, not only on the entry it came from (Lars, 2026-11-16:
  "The important point is that any JS/TS choices not directly from Metz/Owens should comply with
  their principles, patterns, and practices, including JS/TS choices rooted in Fowler's Refactoring
  2e.").
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

## Nx workspace

The repository is an Nx workspace with two projects: `tooling` (the hooks, the mod and the tools, from
`project.json`) and `lz-oop` (the plugin, inferred by `tools/nx/claude-plugin.ts` from its manifest). Run Nx as
`npm exec -- nx`.

- `npm run check` runs `nx run-many -t typecheck lint test test-mods validate overlap citations`. `citations`
  fails when the distributed plugin cites a chapter number (see "What you write").
- `npm exec -- nx run lz-oop:eval -- <claude plugin eval options>` runs the eval suite. Its `pre-eval` step copies
  the plugin and `evals/lz-oop/` into `dist/eval/lz-oop/`, because `claude plugin eval` reads cases only below a
  plugin root and the cases stay out of the distributed plugin. `nx run lz-oop:eval-real` does the same for the
  real-repository cases in `evals/lz-oop-real/`, whose scaffold scripts unpack a pinned commit of a local clone, and
  passes `--scaffold` so those scripts run. Every eval round waits for Lars's go-ahead (Lars,
  2026-11-15: "block on me before each round of runs so that I may check remaining token budget in our Claude
  plan").
- `test` and `overlap` are never cached: both read the git-ignored store, which Nx cannot hash.
- Never set `NX_DAEMON=false` or pass `--skip-nx-cache` (Lars, 2026-11-15: "this Nx workspace may never use
  `NX_DAEMON=false` or `--skip-nx-cache` which is always a smell indicating a misconfigured workspace or
  environment"). Fix the configuration instead.
