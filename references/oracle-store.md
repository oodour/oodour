# Oracle store: layout and admissions

`.oracle/` is git-ignored. Its layout:

| Entry | Holds | Index |
| --- | --- | --- |
| `99-bottles/` | *99 Bottles of OOP*, 2nd edition, JavaScript, converted to Markdown, one file per front-matter part or chapter, plus `images/` | `.oracle/99-bottles/index.md` |
| `metz-talks/` | Caption transcripts of 16 Sandi Metz talks, interviews and Q&A sessions | `.oracle/metz-talks/index.md` |
| `metz-written/` | Sandi Metz articles and blog posts, one file per work | `.oracle/metz-written/index.md` |

`.oracle/README.md` lists one line per entry: the title and its index path. It holds nothing else
(no descriptions, no chapter lists), because every agent may read it.

## Admitting a source

In one change:

1. The `oracle-curator` agent files the work under its entry and adds its index row. Lars can do
   the same by hand.
2. A new entry gets a line in `.oracle/README.md` and a row in the tier table in `AGENTS.md`.
3. The work's title and author names go into `permittedPhrases` in `tools/source-overlap.ts`.
4. Run `node tools/store-check.ts` (index and files agree) and `npm run check`.

Admitting a source can make earlier prose overlap with it, above all when the author published
the same ideas freely elsewhere. After an admission, re-run the overlap check on the repository's
tracked prose.

## Import record

### 2026-11-15: talk transcripts from `lz-engineering-claude-plugins`

Triaged from that repository's `.oracle/videos/index.md` (talk titles and descriptions only). Its
`.oracle/written-content/` holds only Kent Beck material, so nothing came from it.

- **Imported (16)**: the technical talks, interviews and Q&A sessions, listed in
  `.oracle/metz-talks/index.md`. Copied byte for byte and verified with `cmp`.
- **Left out (5)**, as not about object-oriented design: the talk on getting past the barriers to
  public speaking (Hashrocket), the talk on reading the technology future (RubyConf 2014, and its
  second delivery at Beyond the Code 2016), the talk on persuading others (RubyConf 2017), and the
  talk on luck (RubyConf 2019). Import them with the same procedure if that changes.
- **Not imported, related**: two talks by co-author Katrina Owen in the same store (Therapeutic
  Refactoring, Cascadia Ruby 2012; Overkill, Ancient City Ruby 2014).
- **Already present**: that repository's `99-bottles-2e-js/` is byte-identical to `99-bottles/`
  here (same 30 files, same combined SHA-1 of per-file hashes).
