// Parses the JSON a Claude Code command hook receives on stdin into the fields these hooks read.

import { readFileSync } from 'node:fs';
import { isRecord, stringField } from '../mods/oracle-guard/hooks/decide.ts';

export { isRecord, stringField } from '../mods/oracle-guard/hooks/decide.ts';

export interface HookInput {
  readonly hookEventName: string | undefined;
  readonly toolName: string | undefined;
  readonly toolInput: Readonly<Record<string, unknown>>;
  readonly agentType: string | undefined;
  readonly cwd: string | undefined;
  readonly lastAssistantMessage: string | undefined;
  readonly agentTranscriptPath: string | undefined;
  readonly stopHookActive: boolean;
}

export function parseHookInput(raw: unknown): HookInput {
  if (!isRecord(raw)) {
    throw new TypeError('hook input is not a JSON object');
  }

  const toolInput = raw['tool_input'];

  return {
    hookEventName: stringField(raw, 'hook_event_name'),
    toolName: stringField(raw, 'tool_name'),
    toolInput: isRecord(toolInput) ? toolInput : {},
    agentType: stringField(raw, 'agent_type'),
    cwd: stringField(raw, 'cwd'),
    lastAssistantMessage: stringField(raw, 'last_assistant_message'),
    agentTranscriptPath: stringField(raw, 'agent_transcript_path'),
    stopHookActive: raw['stop_hook_active'] === true,
  };
}

export function readHookInput(): HookInput {
  return parseHookInput(JSON.parse(readFileSync(0, 'utf8')));
}

export function denyOutput(reason: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  });
}
