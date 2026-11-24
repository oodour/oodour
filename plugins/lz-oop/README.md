# lz-oop

A Claude Code plugin that coaches object-oriented design in JavaScript and TypeScript, based on Sandi Metz's principles
and practices.

## Skills

- `lz-oop`: shapes code you are about to write or change, judges one piece of existing code, coaches test-first work and
  testing an object's messages, and explains design ideas for your code.
- `lz-oop-review`: reviews the design of a change (uncommitted work, a commit, a branch or a pull request) and ranks
  findings by what they will cost the next change.
- `lz-oop-audit`: audits a package or repository, finds hot spots by churn against complexity, and recommends an order
  of work. It reports and changes nothing.

Claude picks the skill from your request; you can also run `/lz-oop:lz-oop-review` or `/lz-oop:lz-oop-audit` directly.

## Agents

- `lz-oop:reviewer`: reviews the design of a change with fresh context, following `lz-oop-review`. Claude launches it
  when you ask for a review of a change it wrote in the same session, so the review does not come from the change's
  author; you can also ask for it by name with `@agent-lz-oop:reviewer`.
- `lz-oop:auditor`: audits a package or repository with fresh context, following `lz-oop-audit`. Claude launches it when
  you ask for an audit of code it wrote or changed in the same session; you can also ask for it by name with
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

`lz-oop-audit` measures hot spots with the plugin's own command, `scripts/lz-oop.ts`, which needs Node.js 22.18 or
later. Claude Code installs its packages (TypeScript, ESLint and its TypeScript parser, and `ignore`) when it installs
the plugin, with npm from your `PATH`. A plugin loaded from a folder in place (`--plugin-dir`) gets no install: run
`npm ci` in that folder first.

The command keeps Node.js's compiled code of its modules in `node-compile-cache` under your system's temporary folder,
about 5 MB for each Node.js version, so later runs start sooner. Set `NODE_DISABLE_COMPILE_CACHE=1` to turn it off, or
`NODE_COMPILE_CACHE` to another folder; deleting the folder is safe.

## Trusted repositories

Git, a test runner, a linter and a package script can start programs that a repository's own config names, and on
Windows open paths that lead to other machines. So `lz-oop-audit` treats every repository as untrusted: its command
starts no Git process and reads the repository's `.gitignore` files as text, the audit runs none of the repository's
tools, and the report has no commit counts and says why.

To trust a repository, ask for a trusted audit in your own message. Claude Code then asks your permission for the
trusted command, `node "<plugin folder>/scripts/lz-oop.ts" --trusted-repository hotspots -- <scope>`.

Where nobody can answer a prompt (a loop, a schedule, `claude -p`, CI), grant it in advance with an allow rule in your
settings, or with `--allowedTools` for one run:

```text
Bash(node "<plugin folder>/scripts/lz-oop.ts" --trusted-repository hotspots *)
```

The plugin folder is where Claude Code installed the plugin, under `~/.claude/plugins/cache/`, and its last part is the
version, so renew the rule after an update. Keep the quotes: a rule matches the command as written, and the skill quotes
the path so that a folder name with a space still works. Write the folder out in full: a `*` in it also matches a path
that steps back with `..` to a `lz-oop.ts` inside the audited repository. In auto mode the plugin's hook asks you before
the trusted command runs, even when a rule allows it, so run unattended trusted audits in another permission mode. The
hook guards that command only: in an untrusted audit, the skill's instructions are what keep Claude from running Git,
tests or linters, and in auto mode Claude Code's own checks decide such a command.

The trust check is no stronger than your permission settings. A broad allow rule such as `Bash(node *)` or
`Bash(git *)`, or a session with permission checks turned off, lets Claude run those commands on any repository, so keep
allow rules narrow. A repository's own `.claude/settings.json` can hold allow rules too, so read it before you trust the
folder when Claude Code first opens it. An ask rule for the trusted command makes Claude Code ask in every permission
mode.

## Scope

JavaScript and TypeScript only. The plugin stands alone: it needs no other plugin.

All text in this plugin is original writing. The works it draws on are credited in [ATTRIBUTION.md](ATTRIBUTION.md); the
skills and references name patterns, principles and practices but cite no source.

## License

MIT. See [LICENSE](LICENSE).
