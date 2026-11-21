# Keeping the glossary and the ADRs current

`GLOSSARY.md` holds the repository's words, and `docs/adr/` holds the decisions a later reader would otherwise undo.
Both go stale silently: nothing fails when code and words drift apart. This page says when each one changes and how.

## The glossary

### When to change it

Change `GLOSSARY.md` in the same commit as a change that:

- adds a word a user or an agent reads: a kind of report, a part of a message, a kind of rule or config, a step of a
  skill;
- gives a defined word a new meaning, or stops using one;
- uses two words for one thing: keep the better one and list the other under `_Avoid_`;
- uses one word for two things: give each its own word, or narrow one use. Example: "fix" could name both the
  refactoring a lint message recommends and ESLint's automatic change; the glossary calls the first the **Cure** and
  the second one kind of **Remedy**.

Leave out:

- flags, file formats, commands and general programming terms;
- the names of principles, practices, smells, refactorings and patterns taken from the sources. The plugin's
  references define those, in their own words and gated by `oracle-reviewer`. A glossary entry that defined one would
  be a second definition to keep faithful to the source.

The skills, the references and the package READMEs say how things behave; the glossary says what the words mean.

### How

- Put each term under the heading it belongs to (Coaching, Lint rules, Sources).
- Write `**Term**:`, then one or two sentences that say what it is, not what code does with it.
- Add `_Avoid_:` with the words it replaces, and a reason in parentheses when the avoided word means something else
  here: `_Avoid_: audit (an audit covers a whole package or repository)`.
- Wrap at 120 characters.
- After a change, search the shipped files and the instructions for the avoided words, as whole words, and reword any
  hit that means the defined term:
  `rg -n -i -w -e '<word>|<word>' plugins packages/*/README.md packages/*/package.json packages/*/src AGENTS.md references`.
  `-w` matches whole words only, so give each form the word takes (`thresholds?`). A hit that means something else stays: "not a defect" is not a finding, and Fallow's `threshold` key is Fallow's
  name.

## The ADRs

### When to write one

Write an ADR only when a decision passes all three tests:

1. **Hard to reverse.** Changing it later costs something real: a published default consumers rely on, a message
   format agents act on, the store's layout.
2. **Surprising without context.** A reader of the code would ask why, and might "fix" it.
3. **A real trade-off.** There were other options, and they lost for reasons someone stated.

A decision that fails one test gets no ADR. If `AGENTS.md`, a reference, a README, a code comment or a commit body
already gives its reason, that is enough. Examples: the oracle firewall (`AGENTS.md` and
`references/oracle-firewall.md` give its reasons), and the companion configs (a code comment says a preset that turned
on a rule of an uninstalled plugin would throw).

Read the ADRs that cover a change before committing it, as part of the commit, not at the end of the work. When the
change reverses part of one, add a dated `## Update, <YYYY-MM-DD>: <what changed>` section to it. When it reverses all
of it, write a new ADR and give the old one front matter with `status: superseded by ADR-<NNNN>`.

### How

- Name the file `docs/adr/<NNNN>-<slug>.md`, with the next free number.
- Make the title the decision, as a sentence.
- Open with one to three sentences: the situation, the decision, and why.
- Add `## Considered Options` only for rejected options a reader would suggest again, each with why it lost. Add
  `## Consequences` only for effects a reader would not expect.
- Take every reason and rejected option from a record: a ruling of Lars's, a commit body, a measurement, a review
  triage. Never invent an alternative to make the record look complete; when none was written down, leave the section
  out.
- Follow the firewall: cite a source by title and year as the plugin's references do, never with its wording, and
  attribute nothing to Sandi Metz that a reference or an oracle answer does not state. Run
  `node tools/source-overlap.ts <file>` on the ADR before committing it.
- Write for a reader outside the project: no planning IDs, no review round numbers, no session names.
