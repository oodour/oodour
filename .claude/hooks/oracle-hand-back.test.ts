import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadCorpus } from '../../tools/source-overlap.ts';
import { parseHookInput } from './hook-input.ts';
import { lastAssistantText, output, review, run } from './oracle-hand-back.ts';

const copied = 'It says the quick brown fox jumps over the lazy dog.';

function corpus() {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-hand-back-'));
  mkdirSync(join(dir, 'book'));
  writeFileSync(join(dir, 'book', 'ch1.md'), 'the quick brown fox jumps over the lazy dog while the cat watches.');

  return loadCorpus(6, dir);
}

const stop = (fields: Record<string, unknown>) => parseHookInput({ hook_event_name: 'SubagentStop', ...fields });
const handback = (message: string, agentType = 'oracle') =>
  parseHookInput({ hook_event_name: 'PreToolUse', tool_name: 'SubagentHandback', tool_input: { message }, agent_type: agentType });

test('a SubagentStop answer that copies is sent back, and a clean one passes', () => {
  const store = corpus();

  assert.match(review(stop({ agent_type: 'oracle', last_assistant_message: copied }), store) ?? '', /words 3-11 \(9 words, entry book\)/);
  assert.match(review(stop({ agent_type: 'oracle', last_assistant_message: copied, stop_hook_active: true }), store) ?? '', /already sent back once/);
  assert.equal(review(stop({ agent_type: 'oracle', last_assistant_message: 'A fox leaps a sleepy hound.' }), store), undefined);
});

test('a SubagentHandback report is read from its message, where SubagentStop has none', () => {
  const store = corpus();

  assert.match(review(handback(copied), store) ?? '', /Nothing was delivered/);
  assert.match(review(handback(copied, 'oracle-reviewer'), store) ?? '', /Nothing was delivered/);
  assert.match(review(handback(copied, 'oracle-curator'), store) ?? '', /Nothing was delivered/);
  assert.equal(review(handback('A fox leaps a sleepy hound.'), store), undefined);
  assert.equal(review(stop({ agent_type: 'oracle' }), store), undefined);
});

test('agents other than the oracle agents, and other tools, are not gated', () => {
  const store = corpus();

  assert.equal(review(handback(copied, 'haiku-low'), store), undefined);
  assert.equal(review(stop({ agent_type: 'general-purpose', last_assistant_message: copied }), store), undefined);
  assert.equal(
    review(parseHookInput({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { message: copied }, agent_type: 'oracle' }), store),
    undefined,
  );
});

test('the last assistant text is read from a transcript when the stop carries none', () => {
  const transcript = [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'first' }] } }),
    JSON.stringify({ type: 'user', message: { content: 'question' } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use' }, { type: 'text', text: 'last' }] } }),
  ].join('\n');

  assert.equal(lastAssistantText(transcript), 'last');
  assert.equal(lastAssistantText(JSON.stringify({ type: 'assistant', message: { content: 'plain' } })), 'plain');
  assert.equal(lastAssistantText(JSON.stringify({ type: 'user' })), '');

  const dir = mkdtempSync(join(tmpdir(), 'oracle-transcript-'));
  const path = join(dir, 't.jsonl');
  writeFileSync(path, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: copied }] } }));

  assert.match(review(stop({ agent_type: 'oracle', agent_transcript_path: path }), corpus()) ?? '', /Nothing was delivered/);
});

test('the result is a deny at PreToolUse and a block at SubagentStop', () => {
  assert.match(output(handback(copied), 'r'), /"permissionDecision":"deny"/);
  assert.deepEqual(JSON.parse(output(stop({}), 'r')), { decision: 'block', reason: 'r' });
});

test('a failed gate denies a hand-back and lets a stop through with a warning', () => {
  const written: string[] = [];
  const warned: string[] = [];
  const failing = () => {
    throw new Error('broken');
  };

  run(failing, (text) => written.push(text), (message) => warned.push(message));
  assert.match(written[0] ?? '', /"permissionDecision":"deny".*gate failed \(broken\)/);

  const brokenTranscript = stop({ agent_type: 'oracle', agent_transcript_path: join(tmpdir(), 'no-such-transcript.jsonl') });
  run(() => brokenTranscript, (text) => written.push(text), (message) => warned.push(message));
  assert.equal(written.length, 1);
  assert.match(warned[0] ?? '', /gate failed/);
});
