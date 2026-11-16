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
| Drafting a document from the sources | `/lars-mode`, poteto-mode Feature for the document | Oracle rounds, then the draft, then `node tools/source-overlap.ts`, then `oracle-reviewer` until it passes. `pstack:technical-writing` and `pstack:unslop` for the prose. |
| Reviewing drafts | `/lars-review` | Its reviewers judge structure and prose without the store; fidelity to the source is `oracle-reviewer`'s, run once per entry the draft cites. |
| A contested reading of a source | `/lars-board` or `pstack:interrogate` | Feed every member the same oracle answers; members never get the store. A disagreement about what the source says goes back to an oracle, not to a vote. |
| Changing a hook, the mod, or a tool in `tools/` | `/lars-mode`, poteto-mode Bug fix or Feature | The script bar in `~/.claude/references/lars-skill-authoring.md` (Scripts): erasable `.ts`, a `.test.ts` beside it, `npm run check` green on Node.js 22 and 24, code and security review, `/deslop`. Test-first through `lz-tdd:lz-red`, `lz-tdd:lz-tpp` and `lz-tdd:lz-refactor`, per `~/.claude/skills/lars-mode/references/test-first.md`. `pstack:blast-radius` before trusting a small change to the guard's pattern. `lars-mutation-testing` at a checkpoint; the mod's `register.ts` is left out of Stryker's `mutate`, because only the mod engine runs it and the `tooling:test-mods` target checks it. |
| Changing an oracle agent's prompt | poteto-mode Authoring or modifying a skill | `plugin-dev:agent-development` for the format. Re-run one live oracle question after the change; a prompt edit is not verified by reading it. |
| Committing | `lars-principle-atomic-commits` | `pstack:deslop` and `pstack:no-comments` before a commit of code. `.oracle/` stays ignored; `git status` must never list it. |
| A long or unattended sourcing run | lars-mode `playbooks/afk-run.md` | Curators write only their own entry (`lars-principle-one-writer`); the driver merges index changes. |

## Models

The oracle agents pin their models in frontmatter: `oracle` and `oracle-reviewer` on Opus,
because keeping source wording out of an own-words answer is the hard part; `oracle-curator` on
Sonnet, because fetching and filing is mechanical and the hand-back gate checks its report. Do not
pass `model` on the Agent call for them (`lars-principle-fit-model-and-effort`).

## Turning Ruby examples into JavaScript and TypeScript

Most talks and articles teach in Ruby, so an oracle answer often describes a Ruby idiom the plugin must restate in
JavaScript or TypeScript. Lars, 2026-11-16: "For Ruby to JavaScript/TypeScript, consider
@D:\projects\github\microsoft\slack-plus-teams\experts\convert\index.md and its relevant siblings." and "...as well
as the convert documents' links and references". The relevant files there are `ruby-to-ts-ts.md`,
`type-mapping-ts.md` and `js-to-ts-ts.md`; their references sections link the primary documentation to check a
mapping against (the TypeScript handbook's classes, object types, mixins, narrowing, generics, everyday types,
types-from-types and utility types pages; MDN's Array reference; Ruby's Enumerable). Use them for the mapping, write
the plugin's wording and examples yourself, and keep the plugin's rules where they differ:

- Checking whether an object answers a method (`respond_to?` turned into a type guard) is the same smell as checking
  its class. Name the role in a type and trust it.
- No constructor parameter properties, `namespace` or `enum`: the plugin's TypeScript must be erasable. Use fields
  and string literal unions.
- A Ruby module shared by several classes becomes composition (an injected object playing a role), not a mixin
  copied onto a prototype.

## The TypeScript Handbook

Lars, 2026-11-16: "Keep the TypeScript Handbook out of the oracle store: Approve." and "Add an option to compare
against a folder outside the store: Approve." Its docs are under Creative Commons Attribution 4.0, so it is read
directly from the clone at `D:\projects\github\microsoft\TypeScript-Website` (`packages/documentation/copy/en/`),
not through an oracle. The plugin restates what it takes in its own words and names the Handbook page. Check every
plugin file that draws on it against the clone as well as the store:

```sh
node tools/source-overlap.ts --corpus 'D:\projects\github\microsoft\TypeScript-Website\packages\documentation\copy\en' <file>
```

## The plugin itself

`lz-oop` stays independent of `lz-tdd` and every other plugin (c642f84); its test-first practices come
from its own oracle-sourced references. lz-tdd still drives test-first work on this repository's code.
Issues and findings about lz-tdd seen along the way go in [`lz-tdd-ledger.md`](lz-tdd-ledger.md).

Both Opus 5.5 and Sonnet 5.5 run the plugin's skills and read its references, whatever model writes them. Before
writing or revising plugin text, read `~/.claude/references/prompting-opus-5-5.md` and `prompting-sonnet-5-5.md`, not
only the guide for the session's model. Sonnet needs a step stated where it acts: in eval round 21 it skipped steps
the plugin gave only in another reference (Lars, 2026-11-16: "The lz-oop plugin should comply with Sonnet 5.5 and Opus
5.5 guidelines as per ~/.claude/research/ and @claude-code-guide.").

## Dogfooding the plugin

Lars, 2026-11-16: "Can you use a slim `claude -p`-ish setup to dogfood lz-review?" Run the plugin on this
repository's own history the way a user's session would see it, through the slim setup in
`~/.claude/references/slim-claude-p.md`:

1. Clone this repository under `D:/tmp/slim-claude-p/<run>`. The clone holds no store, since the store is
   git-ignored.
2. Delete `CLAUDE.md`, `AGENTS.md` and `.claude/` from the clone's working tree. With them, lz-review did not fire
   (0 of 5 runs, against 3 of 3 without them), most likely because the firewall rules frame every commit as tooling
   work (inferred).
3. Run `run-slim.ts --offline --cwd <clone> --plugin-dir <clone>/plugins/lz-oop --prompt-file <file> --out <json>`
   with a plain request, such as a design review of one commit or a design audit of one folder. Do not name the
   skill: whether it fires is part of what the run measures. It fired when the run's output holds a `Skill` tool
   call naming `lz-review`, `lz-oop` or `lz-audit`.

Each run cost $0.30 to $0.70 on Opus. Triage the findings before acting on them, and record the round in
`plans/lz-oop-research/`. Reviews of code that drew on an oracle answer still go through `oracle-reviewer`; a dogfood
run checks the plugin, not the sources.
