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
| Katrina Owen talk transcripts (2 talks, 2012 and 2014) | `.oracle/owen-talks/` | Sealed |

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
- Cite as the oracles do: `Ch.<n> (<your own words>)` for the book, the talk or article title with
  its year for the others. Never derive a chapter number from a file name.
- Every claim you attribute to Sandi Metz must come from an oracle answer, not from memory, and
  you must mark what is your inference.
- Run `node tools/source-overlap.ts <file>` on any prose you wrote from an oracle answer before you
  commit it.

### Enforcement

Three layers back the prose, and none of them replaces it.

- `.claude/hooks/oracle-guard.ts` (PreToolUse) denies any tool call that names a store path,
  except from the oracle agents, the `.oracle/README.md` listing, `tools/source-overlap.ts` and
  `tools/store-check.ts`.
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
