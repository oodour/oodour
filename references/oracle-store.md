# Oracle store: layout and admissions

`.oracle/` is git-ignored. Its layout:

| Entry | Holds | Index |
| --- | --- | --- |
| `99-bottles-2e-js/` | *99 Bottles of OOP*, 2nd edition, JavaScript, converted to Markdown, one file per front-matter part or chapter, plus `images/` | `.oracle/99-bottles-2e-js/index.md` |
| `metz-talks/` | Transcripts of 28 Sandi Metz talks, interviews, podcasts and Q&A sessions | `.oracle/metz-talks/index.md` |
| `metz-written/` | Sandi Metz articles and blog posts, one file per work, plus the READMEs and code of her public GitHub example repositories under `github/<repo>/` | `.oracle/metz-written/index.md` |
| `99bottles-js/` | A full git clone of `sandimetz/99bottles_js`, the book's companion code, under `repo/`, and each of its 559 tags exported as plain files under `stages/<tag>/` | `.oracle/99bottles-js/index.md` |
| `owen-talks/` | Caption transcripts of 3 talks by co-author Katrina Owen | `.oracle/owen-talks/index.md` |
| `poodr-2e/` | Sandi Metz, *Practical Object-Oriented Design*, 2nd edition, one file per chapter, plus `images/` | `.oracle/poodr-2e/index.md` |
| `fowler-refactoring-2e/` | Martin Fowler, *Refactoring*, 2nd edition, one file per chapter, plus `images/` | `.oracle/fowler-refactoring-2e/index.md` |
| `meszaros-xunit-test-patterns/` | Gerard Meszaros, *xUnit Test Patterns*, one file per chapter, plus `images/` | `.oracle/meszaros-xunit-test-patterns/index.md` |
| `kerievsky-refactoring-to-patterns/` | Joshua Kerievsky, *Refactoring to Patterns*, one file per chapter, plus `images/` | `.oracle/kerievsky-refactoring-to-patterns/index.md` |
| `gamma-design-patterns/` | Gamma, Helm, Johnson and Vlissides, *Design Patterns*, one file per chapter, plus `images/` | `.oracle/gamma-design-patterns/index.md` |
| `metz-cited-articles/` | Public articles and papers the Metz corpus cites, one file per work | `.oracle/metz-cited-articles/index.md` |
| `beck-writing/` | Kent Beck's essays (`written-content/`) and blog archive (`beck-blog/`) | `.oracle/beck-writing/index.md` |
| `wirfs-brock-object-design/` | Rebecca Wirfs-Brock and Alan McKean, *Object Design*, one file per chapter, plus `images/` | `.oracle/wirfs-brock-object-design/index.md` |
| `braithwaite-javascript-allonge-six/` | Reginald Braithwaite, *JavaScript Allongé*, the "Six" edition, one file per chapter or front-matter part | `.oracle/braithwaite-javascript-allonge-six/index.md` |
| `rauschmayer-javascript/` | Axel Rauschmayer, *Exploring JavaScript*, ES2025 edition, one file per chapter or part divider | `.oracle/rauschmayer-javascript/index.md` |
| `fowler-js-articles/` | Martin Fowler's two JavaScript refactoring articles on martinfowler.com, one file per article | `.oracle/fowler-js-articles/index.md` |
| `js-ts-language-reference/` | MDN's JavaScript class reference pages (`mdn/`) and TypeScript Handbook pages (`typescript/`) | `.oracle/js-ts-language-reference/index.md` |
| `99bottles-ruby/` | A full git clone of `sandimetz/99bottles_ruby`, the book's Ruby companion code, under `repo/`, and each of its 866 tags exported as plain files under `stages/<tag>/` | `.oracle/99bottles-ruby/index.md` |

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

On 2026-11-16 the curator exported each of the 559 tags, unchanged, into `.oracle/99bottles-js/stages/<tag>/`
(103 MB) and listed them in a "Stages" section of the entry's `index.md`, because the oracle agents read with
Read and Glob and cannot run git. Every folder's file count matches `git ls-tree -r <tag>`; the clone's HEAD,
index and refs are untouched. This closes the "intermediate stages unread" gap of the v0 plan (Lars, 2026-11-16:
"Audit, triage, and resolve all open/owed/deferred plans/items/runs").

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
still said 22 transcripts, to the 28 it indexes. An oracle then reported that the transcript stops
partway through the panel. On 2026-11-16 a fresh whisper.cpp run of the last 27 minutes of the audio
(from the 60-minute mark) settled it: the stored file already ends with the same closing exchange as the
audio, and the two runs differ only in wording, spread evenly through the tail. Nothing was appended;
the earlier report was a misreading.

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

### 2026-11-15: the POODR 2e sample, and a third Owen talk

Asked whether the store covered duck typing, inheritance and composition beyond *99 Bottles*, Lars answered
"1: Approve" to a gap map and a source search, and pointed to the publisher's sample: "The *Sample Content* tab at
https://www.informit.com/store/practical-object-oriented-design-an-agile-primer-using-9780134456478 contains POODR
2e Table of Contents and a link to download sample pages including Chapter 3." The curator fetched them.

- **poodr-2e-sample, new entry**: the table of contents (markdown.new, cut to the contents) and the sample-pages PDF
  (56 pages: front matter, Chapter 3, end notes, the first index pages), kept beside its text from
  `pdftotext -layout`. MarkItDown doubled every code line number, so it was not used.
- **Rights**: the publisher's page footer reserves text-mining and AI-training rights. Told so, Lars answered:
  "Approve fetching InformIT ToC and POODR 2e sample once for oracle sourcing". The fetch is done and is not
  repeated; the entry is sealed like the others.
- **owen-talks, added (1)**: Katrina Owen's RailsConf 2016 talk, a staged refactoring that ends in polymorphism,
  from YouTube's automatic captions with rolling duplicates collapsed.
- **Not stored**: two InformIT articles by other authors; six further Owen videos off these topics; event pages
  that repeat stored talks; posts by other authors; a paid retailer chapter and a pirated copy. Two searches found
  no public Owen articles on these topics.

### 2026-11-15: the works the corpus keeps citing

Lars asked: "Let me know if Sandi Metz and/or Katrina Owen's corpus repeatedly refers to a source that we should add
to the oracle store". One oracle per entry listed the outside works it cites (summary:
`plans/lz-oop-research/cited-sources.md`, git-ignored). Lars then asked Claude to get them from the repositories that
hold Markdown sources: "Ask the "refactoring-oracle-ee" session (the repo that produces Markdown sources) about
sources it has and to provide the ones in your list that it has available to your oracle store." and approved the
rest: "May the curator agent fetch the public texts once, for the store: Approve." In the lz-tdd session he ruled,
as that session relayed it: "For sources both in this repo's store and refactoring-oracle's libray, lz-oop should get
them from refactoring-oracle."

- **Four books, new entries**: Fowler, *Refactoring*, 2nd edition; Meszaros, *xUnit Test Patterns*; Kerievsky,
  *Refactoring to Patterns*; Gamma, Helm, Johnson and Vlissides, *Design Patterns*. They are Lars's purchased copies,
  converted by the refactoring-oracle repository, which copied them to an intake folder on Lars's yes in its session.
  The curator copied each whole, images included, and checked it with `diff -r`, file counts and byte totals.
- **metz-cited-articles, new entry**: Robert C. Martin's 2000 paper on design principles and patterns (the archived
  PDF kept beside its `pdftotext -layout` text; MarkItDown garbled its apostrophes), Fowler's Design Stamina
  Hypothesis and CommandQuerySeparation bliki pages, and Feathers's Getting Empirical about Refactoring (from
  stickyminds.com; the agileconnection.com address returned a landing page). Fetched once.
- **Not stored**: Katrina Owen's Zero Confidence (Railsberry 2013). Its only recording found is on Vimeo, which needs
  a login; no workaround was tried. Meszaros's test-double web pages were skipped, as the book covers them.
- **From lz-tdd's store**, on Lars's "2: Approve" in that session (as it relayed it), copy-only and checked with
  `diff -r` and `cmp`: Kent Beck's essays and blog archive into a new entry, `beck-writing/`, and three
  martinfowler.com pages on test doubles into `metz-cited-articles/`. Five Metz talks copied by mistake, the ones
  left out as off-topic in the first import above, were removed again.
- **Object Design**: Wirfs-Brock and McKean (2002), which both angular-clean-architecture's store and
  refactoring-oracle hold byte for byte, came from refactoring-oracle per the ruling above, on Lars's "1: Approve" in
  that session, into a new entry, `wirfs-brock-object-design/`.
- **Overlap**: the plugin's 6-word check then found two runs against the new books, a book title with its author and
  a common phrase in `lz-audit`. The titles and author names joined `permittedPhrases`, and the phrase was reworded.

### 2026-11-16: *Practical Object-Oriented Design*, 2nd edition

Lars's purchased copy, converted to Markdown by the refactoring-oracle repository and delivered to an intake folder on
his "1: Approve" in that session (as it relayed it). In this repository Lars answered "2 POODR 2e import: Approve." to
a recommendation to import it as `poodr-2e/` and drop the sample entry.

- **poodr-2e, new entry**: 22 chapter files, `index.md` and `images/`, 65 files and 7,141,949 bytes, copied whole and
  checked with `diff -r`, file counts and byte totals. The index needed no change; `store-check` passes.
- **poodr-2e-sample, removed**: the full book covers the sample's contents and chapter (inferred from the sample's
  record above).

### 2026-11-16: JavaScript sources

The decision audit asked which sources settle a JavaScript or TypeScript form that Metz and Owen leave open (AGENTS.md,
"What you write"). Lars named two books he owns: "I own a copy of "JavaScript for impatient programmers" (2019) by
Dr. Axel Rauschmayer but if the oracle can curate the same edition from GitHub, even better." and "4: I own a copy of
*JavaScript Allongé: the "Six" Edition* by Reg "raganwald" Braithwaite." Then: "My "Impatient JS Programmer" copy is a
preview edition so if the oracle can curate a full edition, that's better."

- **braithwaite-javascript-allonge-six, new entry**: first the author's GitHub manuscript of the Leanpub "Six" edition
  at its last commit (2019-07-11), licensed CC BY-SA 3.0 as its README states (109 of 109 manifest files, joined into
  29). The same day the refactoring-oracle session built Markdown from Lars's purchased EPUB of that edition (build
  commit 9cf712a; 851 code listings checked against the EPUB; endnotes as footnotes per chapter), and the curator
  replaced the manuscript files with that build, per the ruling above that shared sources come from
  refactoring-oracle: 25 chapter files, an index and 50 images, 76 files and 21,864,625 bytes, checked with `diff -r`.
  Known conversion leftovers: an empty contents heading on the title page and a doubled cover image.
- **rauschmayer-javascript, new entry**: *Exploring JavaScript*, ES2025 edition, the successor of *JavaScript for
  impatient programmers*, from the author's site repository (`rauschma/exploringjs.com`, `dist/js/book/`, commit
  9527116bf6, 2025-06-20). The book says every chapter is free to read online, and its table of contents lists exactly
  the 61 pages fetched (50 chapters, 11 part dividers; 1,513,379 bytes, converted with pandoc). No licence is stated;
  treated as all rights reserved. Left out: the PDF and EPUB previews, the code archive, flashcards, changelog and
  images. The ES2019 edition was not taken: its free text lacks at least 4 of its 46 chapters.
- **fowler-js-articles, new entry**, on Lars's "2: Curate them from lz-tdd's repo, if available. Otherwise, curate as
  recommended.": lz-tdd's store holds neither, so the curator fetched Refactoring a JavaScript Video Store (2016) and
  Refactoring Module Dependencies (2015) from martinfowler.com once, through markdown.new; images stay as URLs. They
  duplicate none of the five martinfowler.com pages in `metz-cited-articles/`, whose scope is works Metz and Owen cite.
- **js-ts-language-reference, new entry**, on Lars's "3: OK": six MDN pages from `mdn/content` (commit 74f6e26e70,
  2026-11-16; prose CC BY-SA 2.5, code CC0): the classes reference, `extends` (which holds MDN's mix-ins section),
  `constructor`, `static`, private elements, and the Using classes guide. Four TypeScript pages copied from the local
  TypeScript-Website clone (commit 4ec663ac44, 2026-11-13; content CC BY 4.0, code MIT): Handbook Classes, Narrowing
  and Mixins, and only the `satisfies` section of the 4.9 release notes.
- **Overlap**: the plugin's 6-word check then found five generic runs (two mixin descriptions, a step phrase, an engine
  error message and an index loop in two evals); all were reworded.

### 2026-11-16: the Ruby companion code

On Lars's "1: OK" to importing `sandimetz/99bottles_ruby` the way `99bottles-js` was imported (PHP, Python and the
`_milk` repositories left out), the curator cloned it (HEAD eed2603cf9, 2024-04-10; 294 commits on `main`; no
licence file) and, in a heavy-lock slot, exported its 866 tags into `stages/<tag>/`: 4,330 files and 13,611,643
bytes, matching `git ls-tree -r -l` per tag with no count mismatch.

### 2026-11-16: a corrected *99 Bottles of OOP* build

The refactoring-oracle session rebuilt the book (its `pandoc-clean.lua`, commit be307ac) to drop a stray trailing
backslash that GFM rendered literally, and reported it with Lars's approval to propagate it in that session. Under the
ruling above, the curator compared the build with `99-bottles-2e-js/` first: the same 30 files, three chapter files
differing in 10 lines (1, 4 and 5), each by the trailing backslash only. It replaced those three files, checked the
entry against the build with `diff -r`, and added the source and commit to the entry's `index.md`; all 19 indexed
links resolve.
