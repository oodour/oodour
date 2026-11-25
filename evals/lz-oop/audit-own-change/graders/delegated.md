---
type: tool_used
tool: Agent
input_match: '"subagent_type"\s*:\s*"lz-oop:auditor"'
---

The session handed the audit of code it had just written to the lz-oop:auditor agent. The run without the plugin has no
such agent, so it cannot pass this grader.
