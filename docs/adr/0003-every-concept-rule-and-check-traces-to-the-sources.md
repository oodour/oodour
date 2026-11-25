# Every concept, rule and Fallow check traces to the sources, and code metrics count as traced

OOdour (then named lz-oop) teaches what its sources teach, so each concept a message names, each lint rule and each Fallow check the
presets turn on has an origin in the sealed sources, and the plugin does not invent concept names. Lars, 2026-11-20: "I
would prefer that we don't invent concepts. lz-oop is based on oracle. Every concept, rule, or Fallow check it includes
should have an origin in oracle (Sandi Metz, Katrina Owen, and other sources they reference)."

Code metrics count as traced although no source names Halstead volume, cognitive complexity or the CRAP score: Lars
reads the sources as using metrics to inform design decisions, and holds that autonomous agents need them more (his
words below).

## Considered Options

- **Drop the metric checks that no source names (Halstead volume, cognitive complexity, CRAP).** Claude proposed it on
  2026-11-21 after an audit of each check's origin, and it lost. Lars, 2026-11-21: "Halstead volume: I still want to
  include it. It's clear that Sandi Metz use code metrics to inform her decisions. With autonomous, high-churn agents,
  this is even more important." "Cognitive complexity: Cyclomatic complexity is referenced multiple times from what I
  understand. Cognitive and cyclomatic are related. Keep both." "CRAP: Same decision and reaons as Halstead volume."

## Consequences

- A rule's concept is a smell, principle or practice the sources name. A name the plugin made up for a rule's concept
  gives way to the nearest one the sources use: the ruling above answered Claude's proposal to keep two such names,
  Hidden Dependency and Repeated Absence Check, as the plugin's own.
- Lars approved one name the plugin chose after this ruling, for the manual-dispatch rule's concept, Manual Dispatch.
  Lars, 2026-11-21: "manual-dispatch's concept name: OK". Whether a source uses that name has not been checked; a
  rename to a name the sources use reopens that approval with Lars.
