import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { storePath as scrubStorePath } from '../mods/oracle-scrub/hooks/scrub.ts';
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

test('a store name right after a shell redirection is denied', () => {
  assert.match(call('Bash', { command: 'cat<.oracle/x/index.md' }) ?? '', /oracle-guard/);
});

test('a store name next to a separator, a brace, a comma or a stream suffix is denied', () => {
  assert.match(call('Bash', { command: 'cd .oracle;cat */*.md' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'cd .oracle&&cat */*.md' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'ls .oracle|head' }) ?? '', /oracle-guard/);
  assert.match(call('Bash', { command: 'cat {.oracle,x}/x/index.md' }) ?? '', /oracle-guard/);
  assert.match(call('PowerShell', { command: 'Get-Content .oracle,x' }) ?? '', /oracle-guard/);
  assert.match(call('Glob', { pattern: '{.oracle,src}/**/*.md' }) ?? '', /oracle-guard/);
  assert.match(call('Read', { file_path: 'D:\\repo\\.oracle::$INDEX_ALLOCATION\\x\\index.md' }) ?? '', /oracle-guard/);
});

test('a Monitor command naming the store is denied', () => {
  assert.match(call('Monitor', { command: 'cat .oracle/x/index.md', description: 'd', timeout_ms: 1000 }) ?? '', /oracle-guard/);
});

test("a Monitor command naming an oracle agent's transcript is denied", () => {
  const command = 'tail -f C:/Users/u/.claude/projects/D--repo/s1/subagents/agent-a1.jsonl';

  assert.match(decide(parseHookInput({ tool_name: 'Monitor', tool_input: { command } }), () => 'oracle') ?? '', /oracle-guard/);
});

test('a name that only contains the store name is not the store', () => {
  assert.equal(call('Read', { file_path: 'my.oracle/x.md' }), undefined);
  assert.equal(call('Read', { file_path: 'src/oracle/x.md' }), undefined);
  assert.equal(call('Read', { file_path: '.oracle-notes.md' }), undefined);
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
});

test('a browser url naming the store is denied', () => {
  const url = 'file:///D:/projects/github/LayZeeDK-Premium/lz-oop/.oracle/x/index.md';

  assert.match(call('mcp__claude-in-chrome__navigate', { url }) ?? '', /oracle-guard/);
});

test('a store path nested in an object map is denied', () => {
  assert.match(call('Artifact', { file_path: 'C:/s/page.html', files: { 'a.md': 'D:\\repo\\.oracle\\x\\index.md' } }) ?? '', /oracle-guard/);
});

test('a store path in an array is denied', () => {
  assert.match(call('Artifact', { url: 'u', asset: true, file_paths: ['D:\\repo\\.oracle\\x\\a.pdf'] }) ?? '', /oracle-guard/);
});

test('a store path used as an object key is denied', () => {
  assert.match(call('mcp__fs__copy', { map: { '.oracle/x/index.md': 'out.md' } }) ?? '', /oracle-guard/);
});

test('an Agent prompt carrying an index path, the permitted route, is allowed', () => {
  assert.equal(call('Agent', { subagent_type: 'oracle', prompt: 'Question: x. Index: .oracle/metz-talks/index.md' }), undefined);
});

test('only the message tools carry free text past the guard', () => {
  const text = 'ask the oracle with .oracle/metz-talks/index.md';

  for (const tool of ['SendMessage', 'SubagentHandback', 'TaskCreate', 'TaskUpdate', 'Skill', 'ScheduleWakeup', 'CronCreate', 'PushNotification', 'SendFeedback']) {
    assert.equal(call(tool, { message: text, prompt: text, args: text }), undefined, tool);
  }

  assert.match(call('WebFetch', { url: 'https://example.com/.oracle/x', prompt: 'p' }) ?? '', /oracle-guard/);
  assert.match(call('TodoWrite', { todos: [{ content: text }] }) ?? '', /oracle-guard/);
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
  assert.equal(String(scrubStorePath), String(storePath), 'pattern copies agree');
});
