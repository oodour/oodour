import assert from 'node:assert/strict';
import { test } from 'node:test';
import { denyOutput, parseHookInput } from './hook-input.ts';

test('a hook input object is read into the fields the hooks use', () => {
  const input = parseHookInput({
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
    tool_input: { file_path: 'a.md' },
    agent_type: 'oracle',
    stop_hook_active: true,
    cwd: 'D:\\repo',
  });

  assert.deepEqual(input, {
    hookEventName: 'PreToolUse',
    toolName: 'Read',
    toolInput: { file_path: 'a.md' },
    agentType: 'oracle',
    cwd: 'D:\\repo',
    lastAssistantMessage: undefined,
    agentTranscriptPath: undefined,
    stopHookActive: true,
  });
});

test('fields of the wrong type are dropped, and a missing tool input is empty', () => {
  const input = parseHookInput({
    tool_name: 7,
    tool_input: ['x'],
    stop_hook_active: 'yes',
  });

  assert.equal(input.toolName, undefined);
  assert.deepEqual(input.toolInput, {});
  assert.equal(input.stopHookActive, false);
});

test('input that is not an object is refused', () => {
  const refusal = {
    name: 'TypeError',
    message: 'hook input is not a JSON object',
  };

  assert.throws(() => parseHookInput(null), refusal);
  assert.throws(() => parseHookInput([]), refusal);
});

test('a deny is written in the PreToolUse decision shape', () => {
  assert.deepEqual(JSON.parse(denyOutput('no')), {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'no',
    },
  });
});
