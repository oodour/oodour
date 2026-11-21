# Every lint rule reports at error, and a disable comment must say why

`@layzee/eslint-plugin-lz-oop` turns every rule its presets enable on at `error`, the size and complexity limits
included. The plugin is built for AI coding agents, and an error makes the agent decide: change the code, or turn the
rule off with a reason. Lars, 2026-11-18: "Times are changing. This is a pluign built for AI coding agents who work at a
rate much faster than humans. We keep the error severity instead of warn because it forces the AI coding agent to make a
decision: Apply a fix or disable the rule with a reason."

## Considered Options

- **`warn` for the existing rules the presets turn on as cues.** The first plan set them to `warn`, as cues to look
  rather than gates. It lost to the ruling above.

## Consequences

- The messages of the plugin's size and complexity rules say "stop and look" and name the smell and its cure, so the
  agent has what it needs to decide. Lars, 2026-11-18: "Say 'stop and look' in the messages: Yes. As discussed above,
  the intention is to support the fast-moving pace of AI coding agents but to force them to make an intentional
  decision."
- `@eslint-community/eslint-comments/require-description` is on in every preset, so a comment that turns a rule off
  must say why. Lars, 2026-11-18, on how breaking a rule maps onto an agent: "For an AI coding agent, this translates
  to disabling a rule with a reason, ideally following explicit human approval, prompted guidelines, or subagent
  review".

## Update, 2026-11-20: every message says stop and look

The first consequence now covers every rule, not only the size and complexity ones. Each rule's message opens with
"Stop and look:" and its concept and names a cure, and a test fails the build on a message that does not. Lars,
2026-11-20: "Naming the smell and the cure in lint messages: OK".
