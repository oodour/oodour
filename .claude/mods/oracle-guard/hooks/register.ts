// tool.call in every agent loop: the oracle guard's decision (decide.ts, shared with the classic
// hook .claude/hooks/oracle-guard.ts) on each tool call, before the tool runs.

import type { EngineInterface as Engine, Register, ToolCallInput } from 'claude-code';
import { decide, failedReason, type GuardCall, metaPathOf, ownerFromMeta, toolInputOf, transcriptPaths } from './decide.ts';

// The main loop has no agent id; an id the list does not name (a workflow agent's) has no type either.
async function agentTypeOf($: Engine, agentId: string | undefined): Promise<string | undefined> {
  return agentId === undefined ? undefined : (await $.agent.list()).find((agent) => agent.id === agentId)?.type;
}

// The owner of each transcript the call names; a metadata file that cannot be read leaves it unknown, which decide() denies.
async function transcriptOwners($: Engine, call: GuardCall): Promise<ReadonlyMap<string, string | undefined>> {
  return new Map(
    await Promise.all(
      transcriptPaths(call).map(async (path) => [path, await $.fs.read(metaPathOf(path)).then(ownerFromMeta, () => undefined)] as const),
    ),
  );
}

async function verdict($: Engine, e: ToolCallInput): Promise<string | undefined> {
  const call: GuardCall = { toolName: e.tool, toolInput: toolInputOf(e), agentType: await agentTypeOf($, e.agentId), cwd: await $.session.cwd() };
  const owners = await transcriptOwners($, call);

  return decide(call, { agentTypeOf: (path) => owners.get(path), projectDir: await $.session.root() });
}

export const register: Register = (on) => {
  on('tool.call', async ($, e, next) => {
    const reason = await verdict($, e);

    return reason === undefined ? next(e) : { deny: reason };
  }).catch((_, e, next) => (next.called ? next(e) : { deny: failedReason(next.error.message ?? next.error.kind) }));
};
