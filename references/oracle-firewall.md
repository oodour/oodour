# Oracle firewall: detail

`AGENTS.md` holds the rule and the permitted routes. This file holds what you need when you
consult an oracle, write from its answer, or change the enforcement.

Adapted on 2026-11-15 from the firewalls in `angular-clean-architecture` and
`lz-engineering-claude-plugins`, which recorded the failures these rules answer.

## Consulting an oracle

- **One entry per call.** A question across the book and the talks is two calls; merge the
  answers yourself and keep each claim tied to the entry that made it.
- **Hand over the index path as a string.** You never open it.
- **Ask for the specific thing.** "Which talks discuss replacing a conditional with objects, and
  what does each add?" beats "summarize the talks".
- **Ask for the scope of a negative.** An oracle reads rather than searches, so "she never says X"
  is only as good as the parts it read. Its footer says which parts those were; carry that scope
  into anything you write.
- **Treat every noun as possibly the oracle's own.** The oracle marks words the source does not
  use. Do not drop that mark when you write the claim down, or you attribute your own vocabulary to
  her.
- **Re-ask rather than restate.** When a claim matters, run the oracle again instead of
  paraphrasing an earlier answer or a summary of one.

## Writing from an answer

- The oracle's answer is already in its own words, but your prose built from it is new text that
  nothing has checked yet. Run `node tools/source-overlap.ts <file>` on it before you commit.
- Run the tool on a finished draft only. Feeding it candidate sentences to see which ones match
  turns it into a probe that reconstructs the source one bit at a time.
- A claim credited to Sandi Metz needs an oracle answer behind it. Advice the project adds is the
  project's: say so, and gate the draft with `oracle-reviewer`, which accepts a declared
  adaptation and flags an undeclared one.
- The book is the JavaScript second edition; the talks are mostly Ruby and span 2009 to 2022. Say
  which you mean, and do not present a talk's position as the book's.

## Names are allowed; expression is not

Free to write: the names of principles, rules, refactorings, code smells, patterns and concepts,
and the titles of works. Withheld: prose, the wording of definitions and rules, headings beyond
the bare name, example code and its identifiers, figure captions, memorable lines and anecdotes.

The angular-clean-architecture firewall lets a named principle's defining statement be quoted
verbatim (Lars's ruling there, 2026-08-14). This repository does not: paraphrase the statement and
name it. Lars ruled on 2026-11-15, on the recommendation to keep "no" because the book's named
procedures (the Flocking Rules, Shameless Green, the Squint Test) are its authors' own expression
and the statements it credits to others can be restated and credited to their originators: "Approve
your recommendation."

## The overlap check

`tools/source-overlap.ts` reports runs of words shared with every `.md` file in the store except
`index.md` and `README.md`, as word positions, a length and an entry name. It never prints text,
which is why the guard lets any agent run it.

- Threshold 8 words for a draft (default), 6 for an oracle's hand-back. Ordinary technical English
  collides by chance at four or five words, so lower thresholds buy noise.
- `permittedPhrases` in the tool masks titles, author names, and the public-domain song the
  99 Bottles exercise is built on. Add a work's title there when you admit it.
- It catches verbatim overlap only. A close paraphrase passes it; that judgement stays with you and
  with `oracle-reviewer`.

## Enforcement and its gaps

| Layer | Catches | Misses |
| --- | --- | --- |
| `oracle-guard.ts`, PreToolUse | Any tool call whose path fields, or whose shell command, name `.oracle` | A path built at run time (a glob like `.ora*`, a variable); a recursive listing from the root that never names the store |
| `oracle-hand-back.ts`, PreToolUse on `SubagentHandback` and SubagentStop | An oracle, reviewer or curator report with a 6+ word verbatim run, on either delivery path | Close paraphrase; a run under 6 words |
| `oracle-scrub` mod, `tool.call` | Store paths in Glob and Grep results, and in shell output, when the call did not aim at the store | `tree` output, which names files without their folder path; sessions where the mod engine is off or the plugin is not enabled |

The classic hooks are the floor: they run in every Claude Code session, headless runs and
subagents included. The mod runs only where the `oracle-scrub@lz-oop-dev` plugin is enabled
(`.claude/settings.json` enables it for this project) and the Claude Code build has the mod
engine. Measured on 2026-11-15: the Glob tool run from the repository root lists files inside
the git-ignored `.oracle/`, which is the gap the mod closes.

A subagent delivers its report in one of two ways, measured on 2026-11-15. Through the
`SubagentHandback` tool, the report is that call's `message`, and SubagentStop then carries no
last message; the gate denies the call, the agent rewrites, and only the rewrite is delivered.
Through its last message, the gate blocks SubagentStop instead. The first live oracle answer, on
the first path, carried a 6-word run past a SubagentStop-only gate, which is why both exist.

The guard identifies the oracle agents by `agent_type`. A subagent type named `oracle`,
`oracle-reviewer` or `oracle-curator` from any source passes it, so define no other agent with
those names.

## Changing the firewall

- Change the store pattern in both `oracle-guard.ts` and the mod's `hooks/scrub.ts`; the test
  `the mod scrubs with the same store pattern the guard denies on` fails until they agree.
- Run `npm run check`, which also runs `claude plugin test .claude/mods/oracle-scrub`,
  after any change to a hook, the mod, or the overlap tool.
