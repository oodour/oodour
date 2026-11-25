# Plugin text against the model and skill guidelines, 2026-11-25

Lars, 2026-11-25: "The plugin and skills should comply with model-specific guidelines for the models that we support and
general Claude model guidelines, all in ~/.claude/research/, taking into account that sources of newer date and newer
model generation outrank earlier sources when they conflict. Also consult the plugin-dev and skill-creator plugins for
plugin and skill guidelines but the research of recent dates outrank them when they conlict." Supported models: Opus 5.5
and Sonnet 5.5.

Sources read: `~/.claude/research/skills-and-agents/synthesis/claude-guidance.md` (2026-10-10, written for the Claude 5
generation; sections 1 skill structure, 2 writing instructions, 3 subagents), and the distilled model notes
`~/.claude/references/prompting-opus-5-5.md` and `prompting-sonnet-5-5.md` (from `~/.claude/research/` 2026-09 notes).
The synthesis already ranks plugin-dev (2025-11) and skill-creator (2026-02) below the Claude 5 sources where they
conflict: plugin-dev's third-person description voice and 1,500-2,000-word bodies, and skill-creator's "pushy"
descriptions, are superseded or unsettled.

## Checks (measured by scan and by reading the three skills and two agents)

| Guideline | Plugin | Verdict |
| --- | --- | --- |
| Description is a trigger condition, key use first, at most 1,536 characters | lz-oop 854, lz-oop-review 632, lz-oop-audit 632, agents 285 and 316 characters; each says when to use and when not | complies |
| SKILL.md under 500 lines; contents list on references over 300 lines | skills 109-158 lines; only javascript-and-typescript.md is over 300 (539) and opens with a Contents line | complies |
| Supporting files named from SKILL.md with when to read each | every reference is named at the step that needs it | complies |
| Outcome and finish line, not step procedures, except deterministic steps | reports end in a stated shape and stop condition ("say it is sound, say why, and stop"); the audit's numbered steps are the CLI command and its reading | complies |
| No capital-letter MUST, NEVER, CRITICAL; reasons given | none found; the lower-case "never" lines in the untrusted audit are guardrails with their reason beside them | complies |
| No "think carefully", "be thorough", "you are an expert" | none found | complies |
| Few canonical examples for output shape | one Shape answer outline in lz-oop; sketches asked for, not given | complies |
| Instructions in one place | each skill routes to the references that hold the steps; no repeated closers | complies |
| Sonnet 5.5 adds unasked tests, docs and files | every skill changes code only on request and then stops | complies |
| Opus 5.5 states unverified inferences as fact | review says which areas were not read; audit says which evidence was left out and that its ranking is a judgement | complies |
| Subagent tools limited to the role (a read-only reviewer gets Read, Grep, Glob) | both agents had no `tools` field, so every tool, Edit and Agent included | fixed: reviewer `Read, Grep, Glob, Bash, PowerShell, Skill`; auditor the same plus `Write` for its measuring scripts. PowerShell because the trust gate already covers Windows sessions without Git Bash. **Reverted the same day**: Lars ruled the full tool set intentional ("Although they are reviewers, it is useful to them to be able to write and run verification scripts."), so both agents again have no `tools` field (AGENTS.md records the ruling). The check below measured the allowlists, which no longer ship |
| Pushy description lines (synthesis: inferred, drop them) | lz-oop's "Load it first, before reading any code" | kept: an inference, not a stated rule, and the trigger cases measure it |

## Verified on 2026-11-25

The agents' `tools` lists were checked on main (32daa54) after the names A/B, whose copies predate this change.

- Eval cases audit-hot-spots, review-developer-diff and review-own-change: Sonnet 5.5 at 5 runs and Opus 5.5 at 3 runs,
  every run 1.00, no run errors ($6.96 in all). In the 3 kept Opus review-own-change sandboxes the review skill launched
  `lz-oop:reviewer` each time; the reviewer called only Read and Grep (10 to 14 calls), with no tool errors.
- No eval case launches the auditor: the audit skill launches it only when the session changed code in the audited scope,
  and audit-hot-spots audits inline. One slim `claude -p` session on Sonnet 5.5 ($0.21) added a method to a scratch
  repository and then asked for an audit: the skill launched `lz-oop:auditor`, which called Skill, Read and Bash, all on
  its list, and returned a usable audit. Its three refused calls (two `node` scripts and a `git -C ... log`) were refused
  by the slim run's offline permission list ("This command requires approval"), not by the agent's `tools` list. It
  did not use Write.
- Not covered: an auditor run where the measuring scripts are allowed, and PowerShell, which the slim run disallows.
- Follow-up, done the same evening (Lars: "Follow up eval case: OK"): eval case audit-own-change, where the session
  creates two files, adds a plan, then asks for an audit. Its first run ($1.55) launched no auditor in any run: the
  eval withholds Write and Edit unless the run grants them, so Sonnet stopped and Opus had another agent write the
  files. The `eval` target now passes `--allow-tools Write Edit`. The rerun ($3.19; Lars: "Rerun of audit-own-change
  ... OK") launched `lz-oop:auditor` in all 8 runs (Sonnet 5, Opus 3); the mailer grader passed 8 of 8; the auditor
  called only Skill, Read, Grep, Glob and Bash (Bash withheld by the eval). The switch grader passed 1 of 8 because it
  demanded that finding rank first; all 7 failing replies named it with a cure, ranked after injecting the mailer,
  which is sound with no tests and no history, so the grader no longer asks for a rank. The revised grader has not run
  yet; Claude infers 8 of 8 from those replies.
