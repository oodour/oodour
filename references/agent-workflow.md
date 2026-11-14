# Agent workflow around the oracle

How Lars's skills and the pstack and lz-tdd plugins apply to oracle work in this repository:
which to reach for, why, and what each must not do near the store. `AGENTS.md` and
[`oracle-firewall.md`](oracle-firewall.md) win wherever a skill's own steps differ. These skills
live in Lars's user scope; another contributor without them follows `AGENTS.md` alone.

## The firewall constraint every skill inherits

Any skill that spawns agents (pstack `how`, `why`, `swarm`, `arena`, `architect`, `interrogate`,
`reflect`, `/lars-review`, `/lars-board`, a poteto-mode playbook's delegates) spawns agents that are
not oracle agents. The guard denies them the store, which is correct. So:

- **Run oracle rounds first, in the driver, and hand the agents the answers**, never an
  `.oracle/` path. An oracle answer is in its own words and passed the hand-back gate, so it may go
  into a brief.
- **Tell a code explorer the store is out of scope.** `pstack:how` and `pstack:why` explore the
  repository; the store is not code, and a denied read costs the explorer a round.
- **Cross-model consults** (`copilot` and other metered tools need Lars's yes first) get oracle
  answers at most, never store text.

## Which skill, when

| Work | Mode and playbook | Skills, and why |
| --- | --- | --- |
| Answering what Sandi Metz says about X | `/lars-mode`, poteto-mode Investigation | The `oracle`, one call per entry, not `pstack:how` or `pstack:why`, which read code. `lars-principle-measure-dont-infer`: carry the oracle's scope and its stated-versus-inferred marks into the answer. |
| Adding a source to the store | `/lars-mode`, no playbook fits | The `oracle-curator` agent. `lars-principle-research-first` for finding sources; `lars-principle-record-the-ruling` for an include or exclude decision Lars makes; `references/oracle-store.md` records the import. |
| Drafting a document from the sources | `/lars-mode`, poteto-mode Feature for the document | Oracle rounds, then the draft, then `node tools/source-overlap.mjs`, then `oracle-reviewer` until it passes. `pstack:technical-writing` and `pstack:unslop` for the prose. |
| Reviewing drafts | `/lars-review` | Its reviewers judge structure and prose without the store; fidelity to the source is `oracle-reviewer`'s, run once per entry the draft cites. |
| A contested reading of a source | `/lars-board` or `pstack:interrogate` | Feed every member the same oracle answers; members never get the store. A disagreement about what the source says goes back to an oracle, not to a vote. |
| Changing a hook, the mod, or `tools/source-overlap.mjs` | `/lars-mode`, poteto-mode Bug fix or Feature | Test-first through `lz-tdd:lz-red`, `lz-tdd:lz-tpp` and `lz-tdd:lz-refactor`, per `~/.claude/skills/lars-mode/references/test-first.md`; the tests are `tools/oracle-hooks.test.mjs` and the mod's `tests/`. `pstack:blast-radius` before trusting a small change to the guard's pattern. `lars-mutation-testing` at a checkpoint, with `tools/source-overlap.mjs` and the hooks as the mutated code. |
| Changing an oracle agent's prompt | poteto-mode Authoring or modifying a skill | `plugin-dev:agent-development` for the format. Re-run one live oracle question after the change; a prompt edit is not verified by reading it. |
| Committing | `lars-principle-atomic-commits` | `pstack:deslop` and `pstack:no-comments` before a commit of code. `.oracle/` stays ignored; `git status` must never list it. |
| A long or unattended sourcing run | lars-mode `playbooks/afk-run.md` | Curators write only their own entry (`lars-principle-one-writer`); the driver merges index changes. |

## Models

The oracle agents pin their models in frontmatter: `oracle` and `oracle-reviewer` on Opus,
because keeping source wording out of an own-words answer is the hard part; `oracle-curator` on
Sonnet, because fetching and filing is mechanical and the hand-back gate checks its report. Do not
pass `model` on the Agent call for them (`lars-principle-fit-model-and-effort`).

## The plugin itself

`lz-oop` will sit beside `lz-tdd`, and the 99 Bottles book teaches through test-driven refactoring,
so lz-tdd's skills are also subject matter for the plugin. How the two plugins relate is a design
question for the plugin's own planning, not a rule here.
