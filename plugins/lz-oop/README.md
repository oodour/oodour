# lz-oop

A Claude Code plugin that coaches object-oriented design in JavaScript and TypeScript, based on Sandi Metz's principles
and practices.

## Skills

- `lz-oop`: shapes code you are about to write or change, judges one piece of existing code, coaches test-first work and
  testing an object's messages, and explains design ideas for your code.
- `lz-review`: reviews the design of a change (uncommitted work, a commit, a branch or a pull request) and ranks
  findings by what they will cost the next change.
- `lz-audit`: audits a package or repository, finds hot spots by churn against complexity, and recommends an order of
  work. It reports and changes nothing.

Claude picks the skill from your request; you can also run `/lz-oop:lz-review` or `/lz-oop:lz-audit` directly.

## Agents

- `lz-oop:reviewer`: reviews the design of a change with fresh context, following `lz-review`. Claude launches it when
  you ask for a review of a change it wrote in the same session, so the review does not come from the change's author;
  you can also ask for it by name with `@agent-lz-oop:reviewer`.
- `lz-oop:auditor`: audits a package or repository with fresh context, following `lz-audit`. Claude launches it when you
  ask for an audit of code it wrote or changed in the same session; you can also ask for it by name with
  `@agent-lz-oop:auditor`.

The skills may read their reference files from the plugin folder without asking. A subagent does not get that grant, so
the agents ask to read them; in a session where nobody can answer a prompt, such as `claude -p`, add the plugin folder
to `permissions.additionalDirectories` or each agent works from its skill's text alone.

Status: 0.0.0, a scaffold under evaluation. Not yet recommended for use.

## Install

```text
/plugin marketplace add LayZeeDK-Premium/lz-oop
/plugin install lz-oop@lz-oop
```

`lz-audit` measures hot spots with the plugin's own command, `scripts/lz-oop.ts`, which needs Node.js 22.18 or later.
Claude Code installs its packages (TypeScript, ESLint and its TypeScript parser) when it installs the plugin, with npm
from your `PATH`. A plugin loaded from a folder in place (`--plugin-dir`) gets no install: run `npm ci` in that folder
first.

## Scope

JavaScript and TypeScript only. The plugin stands alone: it needs no other plugin.

All text in this plugin is original writing. The works it draws on are credited in [ATTRIBUTION.md](ATTRIBUTION.md); the
skills and references name patterns, principles and practices but cite no source.

## License

MIT. See [LICENSE](LICENSE).
