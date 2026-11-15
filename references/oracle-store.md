# Oracle store: layout and admissions

`.oracle/` is git-ignored. Its layout:

| Entry | Holds | Index |
| --- | --- | --- |
| `99-bottles-2e-js/` | *99 Bottles of OOP*, 2nd edition, JavaScript, converted to Markdown, one file per front-matter part or chapter, plus `images/` | `.oracle/99-bottles-2e-js/index.md` |
| `metz-talks/` | Transcripts of 28 Sandi Metz talks, interviews, podcasts and Q&A sessions | `.oracle/metz-talks/index.md` |
| `metz-written/` | Sandi Metz articles and blog posts, one file per work, plus the READMEs and code of her public GitHub example repositories under `github/<repo>/` | `.oracle/metz-written/index.md` |
| `99bottles-js/` | A full git clone of `sandimetz/99bottles_js`, the book's companion code, under `repo/` | `.oracle/99bottles-js/index.md` |
| `owen-talks/` | Caption transcripts of 2 talks by co-author Katrina Owen | `.oracle/owen-talks/index.md` |

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
  Refactoring, Cascadia Ruby 2012; Overkill, Ancient City Ruby 2014). Imported later the same day
  into their own entry, `owen-talks/` (see below).
- **Already present**: that repository's `99-bottles-2e-js/` is byte-identical to the entry of
  the same name here (renamed from `99-bottles/` on 2026-11-15, at Lars's request)

### 2026-11-15: talks, articles and code from the web

Lars asked for Sandi Metz written content from the web and GitHub, for public sources on duck
typing, inheritance and composition, and for the blog posts from the sandimetz.com blog listing
and its pagination. The `oracle-curator` agent fetched them.

- **metz-talks, added (5)**: The Bike Shed live episode (2016), a POODR Q&A session (2014), a
  POODR panel (2021), The Changelog episode 225, and Radio Free Rabbit episode 125. The last two
  arrived with front matter instead of the entry's header block; the curator prepended the header
  on 2026-11-15, marking fields it could not establish `unknown`, and checked by hash that the text
  below it is unchanged.
- **metz-written, added**: 12 blog posts, a dev.to AMA, and 13 public `skmetz` GitHub example
  repositories: 11 READMEs as top-level files and 232 code files under `github/<repo>/`.
- **Not stored**: Ruby Rogues episode 87 (the POODR book club; the host returned HTTP 500 and the
  url-to-markdown fallback crashed; playwriter-cli and WebFetch were not tried), filed later the same
  day (see below); seven short third-party clips, left for Lars to decide; her newsletter, which has
  no public archive.

### 2026-11-15: the companion code repository

Lars: "The `sandimetz/99bottles_js` GitHub repo ... should also be sourced as a full clone for the
oracle. Note that it uses a Yarn Classic (v1.x) lockfile." Cloned in full to
`.oracle/99bottles-js/repo/` (298 commits, 559 tags). Nothing is installed; install with Yarn 1,
not npm, if a run ever needs the dependencies.

### 2026-11-15: Katrina Owen's talks

Asked whether to import Katrina Owen's two talks, Lars answered: "Yes." The curator copied both
transcripts byte for byte from `lz-engineering-claude-plugins`' store into a new entry,
`owen-talks/` (verified with `cmp`), since `metz-talks/` holds Sandi Metz's talks. Their titles
count as permitted names in the overlap check, like the other talk and article titles.

### 2026-11-15: Ruby Rogues episode 87

Lars: "Retry Ruby Rogues episode 87 with playwriter-cli: Yes". The podcast moved from devchat.tv
(HTTP 500, then connect timeouts) to topenddevs.com, whose episode page has show notes and no
transcript, and playwriter-cli is not installed here. The curator fetched the episode audio from its
public podcast feed host (about 88 minutes, January 2013) and transcribed it with whisper.cpp
(`small.en`), since no captions exist; the file header says names may be misheard. Filed in
`metz-talks/`, which now indexes 22 transcripts. The whisper run was not booked on the machine's
shared heavy lock; the curator definition now asks for it.

Later that day the oracle could not read the file: whisper had written the whole body as one line,
longer than the Read tool's limit. The curator broke it at sentence ends into lines of at most 200
characters, with the same 16,700 words before and after, and corrected the entry's intro, which
still said 22 transcripts, to the 28 it indexes. Read in full after the reflow, the transcript stops
partway through the panel, with no closing picks, against the 88 minutes its header gives; since the
reflow kept every word, the cut comes from the transcription. A fresh whisper.cpp run of the tail is open.

### 2026-11-15: sweep for audio, video and text

Lars's program asked for "oracle curation of Sandi Metz audio (look for podcasts, etc.), video, and
text sources". In an AFK run the curator searched for public material the store lacked and filed
items that have captions or a published transcript, at most 25 in the pass.

- **Filed (9)**: in `metz-talks/`, the Deconstruct 2018 talk (publisher transcript), a 2014 New
  Relic FutureTalk and two deliveries of a 2013 and 2017 talk (auto captions), Radio Free Rabbit
  episode 126 and Why Are Computers episode 3 (publisher transcripts); in `metz-written/`, a 2013
  InfoQ interview, a 2013 Hashrocket conversation and a 2020 Superhighway Q&A. The three written
  files keep the fetched page's navigation text unedited.
- **Found, not filed, audio only**: Tech Done Right 69, Greater Than Code 8, Code with Jason 28,
  CodeNewbie 41 and 42, thoughtbot podcast 51, and a Ruby Book Club interview. They need a
  whisper.cpp run on the heavy lock; several hosts were unreachable.
- **Found, not filed, other**: further recordings of talks already stored, and the keynotes on
  careers, persuasion, luck and the future of technology (left out as before).

store-check: `metz-talks` 28 indexed, `metz-written` 27, every entry consistent.

### 2026-11-15: working copies cleaned up

The curators' fetches left working copies (captions, raw pages, JSON, code) in the session
scratchpad, outside the store; a security review found them. The curator moved them into
`.oracle/.staging/2026-11-15/`. Asked whether to delete them after checking that every work is
filed in its entry, Lars answered: "Approve." The curator deleted the 261 files whose work is
filed, and kept 52 whose work is not: two deliberately skipped scholarship posts and the raw blog
listing that holds them, one deliberately skipped repository, a few unmatched pages, and captions of
19 videos that no entry holds (the short third-party clips among them). Asked to skip the clips and
delete all 52, Lars answered: "Approve." `.staging/` is gone. A curator now writes downloads and
transcripts inside the store from the start. (same 30 files, same combined SHA-1 of per-file hashes).
