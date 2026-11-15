import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toolInputOf } from '../hooks/decide.ts';

test("a tool.call event's own keys are not the tool's input", () => {
  const event = { tool: 'mcp__x__y', tool_use_id: 't1', agentId: 'a1', requestMeta: { 'anthropic/sources': 'x' }, path: 'a.md' };

  assert.deepEqual(toolInputOf(event), { path: 'a.md' });
});
