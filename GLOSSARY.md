# lz-oop

Coaching object-oriented design in JavaScript and TypeScript the way Sandi Metz teaches it: skills that advise, lint
rules that check, both written from sources the repository keeps sealed.

The names of principles, practices, smells, refactorings and patterns the plugin takes from its sources (Shameless
Green, the Flocking Rules, Feature Envy, Extract Function) are not defined here. The plugin's references define them in
their own words.

## Coaching

**Coach**:
The plugin's advice on code someone is about to write or change, or on one piece of existing code: where a change
goes, how to make it in small steps, which test comes next, what a design idea means for that code.
_Avoid_: assistant

**Review**:
Judging the design of one change (uncommitted work, a commit, a branch or a pull request) by what it will cost the
next change.
_Avoid_: audit (an audit covers a whole package or repository)

**Audit**:
Judging the design of a whole package or repository to find where change costs most, and recommending an order of
work. An audit changes nothing.
_Avoid_: review (a review covers one change), scan

**Finding**:
One design problem a review or an audit reports, with where it sits, what it will cost, and its cure.
_Avoid_: issue, violation, defect

**Smell**:
One entry of the plugin's list of smells, which defines each of them. A smell is a place to look, not proof of a
problem.
_Avoid_: anti-pattern, code smell

**Cure**:
The named refactoring or practice that removes a smell, as a finding or a lint message recommends it.
_Avoid_: fix (a fix is one kind of remedy), solution

**Hot spot**:
A file that both changes often and is complex, where an audit reads first.
_Avoid_: hotspot (except as the name of a tool's flag)

**Churn**:
How often a file changed over a period, counted in commits.

## Lint rules

**Limit**:
The most of something a size or complexity rule allows, such as lines per function or paths through it.
_Avoid_: threshold, ceiling

**Stop-and-look message**:
A lint message that names the smell a report points at, what to look for, and its cure, for a rule that cannot tell a
real problem from a harmless one. It asks for a decision: change the code or disable the rule with a reason.

**Remedy**:
How a reader gets from a report to changed code, in order of preference: an automatic fix, a suggestion to accept, or
none. A remedy other than a fix says why nothing earlier in that order is possible.
_Avoid_: cure (the cure is the refactoring; the remedy is how the rule helps apply it)

**Wrapped rule**:
A rule of this plugin that runs an existing ESLint, typescript-eslint or third-party rule with lz-oop's options and a
message of its own that names the smell and its cure. The rule it wraps is a duplicate.
_Avoid_: borrowed rule, proxy rule

**Concept**:
What a rule of this plugin, or a cue, prompts a look at: a smell, a principle or a practice the plugin teaches.

**Catalog**:
The plugin's list of existing rules from ESLint, typescript-eslint and third-party plugins, each one a cue, a conflict
or a duplicate.

**Cue**:
An existing rule the presets turn on because it points at a concept.

**Conflict**:
An existing rule that works against a concept, off in every preset.

**Duplicate**:
An existing rule that one of this plugin's own rules replaces, off in every preset so one problem is reported once.

**Tier**:
Which presets turn a rule on: recommended rules are on in every preset, strict rules only in the strict presets.

**Preset**:
A ready-made configuration a consumer turns on whole: recommended or strict, each with a variant that needs type
information.
_Avoid_: profile, ruleset

**Companion config**:
A configuration that turns on the rules that wrap or cue an optional third-party plugin, for a consumer who has
installed that plugin.

## Sources

**Store**:
The repository's git-ignored folder of copyrighted sources: books, talk transcripts, articles and companion code.
_Avoid_: corpus, library

**Entry**:
One work, or one set of works, in the store, with an index of its own.

**Sealed**:
Said of an entry whose text no session may read; only the oracle agents open it.

**Oracle**:
The agent that answers a question from one entry in its own words. The **oracle reviewer** gates a draft against one
entry; the **curator** is the only agent that adds to or changes the store.

**Firewall**:
The rules and checks that keep the store's wording out of every session's context and everything it writes.

**Overlap**:
A run of six or more words a text shares with the store.
_Avoid_: copy, match
