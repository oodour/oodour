import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseHookInput } from './hook-input.ts';
import { decide, run, storePath } from './oracle-guard.ts';

const call = (toolName: string, toolInput: Record<string, unknown>, agentType?: string): string | undefined =>
  decide(parseHookInput({ tool_name: toolName, tool_input: toolInput, agent_type: agentType }));

test('the guard denies the driver and other agents every route into the store', () => {
  assert.match(call('Read', { file_path: 'D:\\repo\\.oracle\\metz-talks\\index.md' }) ?? '', /oracle-guard/);
  assert.match(call('Glob', { pattern: '.oracle/**/*.md' }) ?? '', /oracle-guard/);
  assert.match(call('Grep', { pattern: 'x', path: '.oracle' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'cat .oracle/99-bottles-2e-js/index.md' }) ?? '', /oracle-guard/);
  assert.match(call('PowerShell', { command: 'Get-Content .ORACLE\\x.md' }) ?? '', /oracle-guard/);
  assert.match(call('Write', { file_path: '.oracle/new.md', content: 'x' }) ?? '', /oracle-guard/);
  assert.match(call('NotebookEdit', { notebook_path: '.oracle/n.ipynb' }) ?? '', /oracle-guard/);
  assert.match(call('Read', { file_path: '.oracle/99-bottles-2e-js/index.md' }, 'general-purpose') ?? '', /oracle-guard/);
  assert.match(call('mcp__fs__read_file', { path: '/repo/.oracle/a.md' }) ?? '', /oracle-guard/);
});

const subagents = 'C:\\Users\\u\\.claude\\projects\\D--repo\\s1\\subagents';

test("a Read of an oracle agent's transcript is denied", () => {
  const verdict = decide(parseHookInput({ tool_name: 'Read', tool_input: { file_path: `${subagents}\\agent-a1.jsonl` } }), () => 'oracle');

  assert.match(verdict ?? '', /oracle-guard/);
});

test("a Read of another agent's transcript is allowed", () => {
  const verdict = decide(parseHookInput({ tool_name: 'Read', tool_input: { file_path: `${subagents}\\agent-b2.jsonl` } }), () => 'general-purpose');

  assert.equal(verdict, undefined);
});

test("reviewer and curator transcripts are denied like the oracle's", () => {
  for (const agentType of ['oracle-reviewer', 'oracle-curator']) {
    const verdict = decide(parseHookInput({ tool_name: 'Read', tool_input: { file_path: `${subagents}\\agent-c3.jsonl` } }), () => agentType);

    assert.match(verdict ?? '', /oracle-guard/, agentType);
  }
});

test("a shell command naming an oracle agent's transcript is denied", () => {
  const path = 'C:/Users/u/.claude/projects/D--repo/s1/subagents/agent-a1.jsonl';
  const agentTypeOf = (candidate: string): string | undefined => (candidate === path ? 'oracle' : undefined);

  assert.match(decide(parseHookInput({ tool_name: 'Bash', tool_input: { command: `tail -n 5 ${path} | head` } }), agentTypeOf) ?? '', /oracle-guard/);
  assert.match(decide(parseHookInput({ tool_name: 'PowerShell', tool_input: { command: `Get-Content '${path}'` } }), agentTypeOf) ?? '', /oracle-guard/);
});

test('a transcript whose agent type cannot be resolved is denied', () => {
  const unresolved = (): string | undefined => undefined;

  assert.match(decide(parseHookInput({ tool_name: 'Bash', tool_input: { command: 'cat ~/.claude/projects/D--repo/s1/subagents/agent-*.jsonl' } }), unresolved) ?? '', /oracle-guard/);
  assert.match(decide(parseHookInput({ tool_name: 'Read', tool_input: { file_path: `${subagents}\\agent-a1.jsonl` } })) ?? '', /oracle-guard/);
});

test('a Glob or Grep aimed at a subagents folder is denied', () => {
  const session = 'C:\\Users\\u\\.claude\\projects\\D--repo\\s1';

  assert.match(decide(parseHookInput({ tool_name: 'Grep', tool_input: { pattern: 'x', path: subagents } })) ?? '', /oracle-guard/);
  assert.match(decide(parseHookInput({ tool_name: 'Glob', tool_input: { pattern: 'subagents/*.jsonl', path: session } })) ?? '', /oracle-guard/);
  assert.equal(decide(parseHookInput({ tool_name: 'Grep', tool_input: { pattern: 'x', path: 'C:\\Users\\u\\.claude\\projects\\D--repo\\memory' } })), undefined);
});

test('the overlap tool exception admits no second command', () => {
  assert.match(call('Bash', { command: 'node tools/source-overlap.ts x.md | cat .oracle/a.md' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'node tools/source-overlap.ts x.md\ncat .oracle/a.md' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'node tools/source-overlap.ts x.md\r\ncat .oracle/a.md' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'node tools/source-overlap.ts x.md; cat .oracle/a.md' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'node tools/source-overlap.ts $(cat .oracle/a.md)' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'node tools/source-overlap.mjs .oracle/a.md' }) ?? '', /oracle-guard/);
});

test('the listing exception covers the listing alone', () => {
  assert.equal(call('Read', { file_path: '.oracle/README.md' }), undefined);
  assert.equal(call('Read', { file_path: 'D:\\repo\\.oracle\\README.md' }), undefined);
  assert.match(call('Read', { file_path: '.oracle/99-bottles-2e-js/README.md' }) ?? '', /oracle-guard/);
  assert.match(call('Read', { file_path: '.oracle/x/.oracle/README.md' }) ?? '', /oracle-guard/);
  assert.match(call('Glob', { pattern: 'README.md', path: '.oracle' }) ?? '', /oracle-guard/);
});

test('the guard lets the permitted routes through', () => {
  assert.equal(call('Read', { file_path: '.oracle/99-bottles-2e-js/index.md' }, 'oracle'), undefined);
  assert.equal(call('Glob', { pattern: '*.md', path: '.oracle/metz-talks' }, 'oracle-reviewer'), undefined);
  assert.equal(call('Bash', { command: 'cp a.md .oracle/metz-written/a.md' }, 'oracle-curator'), undefined);
  assert.equal(call('Bash', { command: 'node tools/source-overlap.ts --min-words 6 draft.md' }), undefined);
  assert.equal(call('Bash', { command: 'node tools\\source-overlap.ts .oracle/a.md' }), undefined);
  assert.equal(call('Bash', { command: 'node tools/store-check.ts' }), undefined);
  assert.match(call('Bash', { command: 'node tools/store-check.ts\ncat .oracle/a.md' }) ?? '', /oracle-guard/);
  assert.equal(call('Write', { file_path: 'AGENTS.md', content: 'keep out of .oracle/' }), undefined);
  assert.equal(call('Grep', { pattern: '\\.oracle', path: 'AGENTS.md' }), undefined);
  assert.equal(call('Read', { file_path: 'tools/source-overlap.test.ts' }), undefined);
  assert.equal(call('WebFetch', { url: 'https://example.com/.oracle/x' }), undefined);
});

test('a reader agent gets no tool but Read and Glob on the store', () => {
  assert.match(call('Bash', { command: 'cat .oracle/a.md' }, 'oracle') ?? '', /oracle-guard/);
  assert.match(call('Write', { file_path: '.oracle/a.md' }, 'oracle-reviewer') ?? '', /oracle-guard/);
});

test('a guard that cannot read its input denies the call', () => {
  const written: string[] = [];

  run(
    () => {
      throw new Error('bad stdin');
    },
    (output) => written.push(output),
  );

  assert.equal(written.length, 1);
  assert.match(written[0] ?? '', /"permissionDecision":"deny".*the guard failed \(bad stdin\)/);
});

test("the guard reads a transcript's owner from the metadata file beside it", () => {
  const folder = join(mkdtempSync(join(tmpdir(), 'oracle-guard-')), 'subagents');
  const verdictFor = (id: string): string[] => {
    const written: string[] = [];

    run(() => parseHookInput({ tool_name: 'Read', tool_input: { file_path: join(folder, `agent-${id}.jsonl`) } }), (output) => written.push(output));

    return written;
  };

  mkdirSync(folder);
  writeFileSync(join(folder, 'agent-g1.meta.json'), JSON.stringify({ agentType: 'general-purpose' }));
  writeFileSync(join(folder, 'agent-o1.meta.json'), JSON.stringify({ agentType: 'oracle' }));
  writeFileSync(join(folder, 'agent-x1.meta.json'), '{not json');

  assert.deepEqual(verdictFor('g1'), []);
  assert.match(verdictFor('o1')[0] ?? '', /"permissionDecision":"deny"/);
  assert.match(verdictFor('x1')[0] ?? '', /"permissionDecision":"deny"/);
  assert.match(verdictFor('missing')[0] ?? '', /"permissionDecision":"deny"/);
});

test('an allowed call writes nothing', () => {
  const written: string[] = [];

  run(() => parseHookInput({ tool_name: 'Read', tool_input: { file_path: 'AGENTS.md' } }), (output) => written.push(output));

  assert.deepEqual(written, []);
});

test('the mod scrubs with the same store pattern the guard denies on', () => {
  const mod = readFileSync(new URL('../mods/oracle-scrub/hooks/scrub.ts', import.meta.url), 'utf8');

  assert.ok(mod.includes(`export const storePath = ${String(storePath)};`), 'pattern copies agree');
});
