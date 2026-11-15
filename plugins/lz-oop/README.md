# lz-oop

A Claude Code plugin that coaches object-oriented design in JavaScript and TypeScript, based on
Sandi Metz's principles and practices.

## Skills

- `lz-oop`: shapes code you are about to write or change, judges one piece of existing code,
  coaches test-first work and testing an object's messages, and explains design ideas for your code.
- `lz-review`: reviews the design of a change (uncommitted work, a commit, a branch or a pull
  request) and ranks findings by what they will cost the next change.
- `lz-audit`: audits a package or repository, finds hot spots by churn against complexity, and
  recommends an order of work. It reports and changes nothing.

Claude picks the skill from your request; you can also run `/lz-oop:lz-review` or
`/lz-oop:lz-audit` directly.

Status: 0.0.0, a scaffold under evaluation. Not yet recommended for use.

## Install

```text
/plugin marketplace add LayZeeDK-Premium/lz-oop
/plugin install lz-oop@lz-oop
```

## Scope

JavaScript and TypeScript only. The plugin stands alone: it needs no other plugin.

All text in this plugin is original writing. Ideas credited to Sandi Metz are cited to the work
they come from.

## License

MIT. See [LICENSE](LICENSE).
