import type { On } from 'claude-code';
import { expect, test } from 'claude-code/testing';

const projectDir = 'D:\\repo';
const storeIndex = 'D:\\repo\\.oracle\\metz-talks\\index.md';

// Stands in for the session beneath the plugin: its agents, its directories, and a tool that answers.
function session(on: On, agents: readonly { readonly id: string; readonly type: string }[] = [], cwd = projectDir): void {
  on('agent.list', () => ({ value: agents.map(({ id, type }) => ({ id, type, description: 'd', status: 'running' as const })) }));
  on('session.cwd', () => ({ value: cwd }));
  on('session.root', () => ({ value: projectDir }));
  on('tool.call', () => ({ result: 'ran' }));
}

test('a store Read on the main loop is denied', async ($, on) => {
  session(on);

  const ran = await $.tool.call({ tool: 'Read', file_path: storeIndex });

  expect(ran.deny).toMatch(/oracle-guard/);
});

test('the same Read by an oracle agent passes', async ($, on) => {
  session(on, [{ id: 'a1', type: 'oracle' }]);

  const ran = await $.tool.call({ tool: 'Read', file_path: storeIndex, agentId: 'a1' });

  expect(ran.deny).toBeUndefined();
  expect(ran.result).toBe('ran');
});

test('a call from an agent the list does not name is denied when it names the store, as a workflow agent is', async ($, on) => {
  session(on, [{ id: 'a1', type: 'oracle' }]);

  const named = await $.tool.call({ tool: 'Read', file_path: storeIndex, agentId: 'w9' });
  const other = await $.tool.call({ tool: 'Read', file_path: 'D:\\repo\\AGENTS.md', agentId: 'w9' });

  expect(named.deny).toMatch(/oracle-guard/);
  expect(other.result).toBe('ran');
});

test('a guard that throws denies the call, even one that names nothing in the store', async ($, on) => {
  on('agent.list', () => {
    throw new Error('agent list unavailable');
  });
  on('tool.call', () => ({ result: 'ran' }));

  const ran = await $.tool.call({ tool: 'Read', file_path: 'D:\\repo\\AGENTS.md', agentId: 'a1' });

  expect(ran.deny).toMatch(/oracle-guard: the guard failed/);
});

test("the store tools may name the store only from the session's project root", async ($, on) => {
  session(on);

  const ran = await $.tool.call({ tool: 'Bash', command: 'node tools/store-check.ts .oracle' });

  expect(ran.result).toBe('ran');
});

test('the store tools are denied the store from another folder', async ($, on) => {
  session(on, [], 'D:\\elsewhere');

  const ran = await $.tool.call({ tool: 'Bash', command: 'node tools/store-check.ts .oracle' });

  expect(ran.deny).toMatch(/oracle-guard/);
});

const subagents = 'C:\\Users\\u\\.claude\\projects\\D--repo\\s1\\subagents';

// Answers the metadata file beside each transcript, as Claude Code writes it.
function transcripts(on: On, owners: Readonly<Record<string, string>>): void {
  on('fs.read', (_, e) => {
    const owner = Object.entries(owners).find(([id]) => e.path === `${subagents}\\agent-${id}.meta.json`)?.[1];

    if (owner === undefined) {
      throw new Error(`ENOENT: ${e.path}`);
    }

    return { value: JSON.stringify({ agentType: owner }) };
  });
}

test("a Read of another agent's transcript passes", async ($, on) => {
  session(on);
  transcripts(on, { g1: 'general-purpose' });

  const ran = await $.tool.call({ tool: 'Read', file_path: `${subagents}\\agent-g1.jsonl` });

  expect(ran.result).toBe('ran');
});

test("a Read of an oracle agent's transcript, or of one whose metadata cannot be read, is denied", async ($, on) => {
  session(on);
  transcripts(on, { o1: 'oracle' });

  const oracle = await $.tool.call({ tool: 'Read', file_path: `${subagents}\\agent-o1.jsonl` });
  const unknown = await $.tool.call({ tool: 'Read', file_path: `${subagents}\\agent-missing.jsonl` });

  expect(oracle.deny).toMatch(/oracle-guard/);
  expect(unknown.deny).toMatch(/oracle-guard/);
});
