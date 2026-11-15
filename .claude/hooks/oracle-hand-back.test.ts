import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { type Corpus, loadCorpus } from '../../tools/source-overlap.ts';
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

test('a transcript line that cannot be parsed is skipped when a parsed line follows it', () => {
  const said = (text: string): string => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

  assert.equal(lastAssistantText([said('first'), '{"type":"assist', said('last')].join('\n')), 'last');
});

test('a half-written last line fails the check, since it may be the final report', () => {
  const said = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'earlier' }] } });

  assert.throws(() => lastAssistantText([said, '{"type":"assist'].join('\n')), /could not be parsed/);
});

test('the last message is gathered from every trailing record that carries its id', () => {
  const record = (id: string, text: string): string => JSON.stringify({ type: 'assistant', message: { id, content: [{ type: 'text', text }] } });
  const transcript = [record('m1', 'earlier'), record('m2', 'first part'), record('m2', 'second part')].join('\n');

  assert.equal(lastAssistantText(transcript), 'first part\nsecond part');
});

test('an empty last message is read from the transcript like a missing one', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'oracle-transcript-')), 't.jsonl');
  writeFileSync(path, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: copied }] } }));

  assert.match(review(stop({ agent_type: 'oracle', last_assistant_message: '', agent_transcript_path: path }), corpus()) ?? '', /Nothing was delivered/);
});

test('a transcript with no readable answer and an unparsable line blocks a first stop', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'oracle-transcript-')), 't.jsonl');
  const written: string[] = [];
  writeFileSync(path, `${JSON.stringify({ type: 'user', message: { content: 'q' } })}\n{"type":"assist`);

  run(() => stop({ agent_type: 'oracle', agent_transcript_path: path }), (text) => written.push(text), () => undefined);

  assert.match(written[0] ?? '', /"decision":"block".*could not be parsed/);
});

test('the result is a deny at PreToolUse and a block at SubagentStop', () => {
  assert.match(output(handback(copied), 'r'), /"permissionDecision":"deny"/);
  assert.deepEqual(JSON.parse(output(stop({}), 'r')), { decision: 'block', reason: 'r' });
});

test('a failed gate denies a hand-back, blocks a first stop, and lets a second stop through with a warning', () => {
  const written: string[] = [];
  const warned: string[] = [];
  const failing = () => {
    throw new Error('broken');
  };
  const missing = join(tmpdir(), 'no-such-transcript.jsonl');

  run(failing, (text) => written.push(text), (message) => warned.push(message));
  assert.match(written[0] ?? '', /"permissionDecision":"deny".*gate failed \(broken\)/);

  run(() => stop({ agent_type: 'oracle', agent_transcript_path: missing }), (text) => written.push(text), (message) => warned.push(message));
  assert.match(written[1] ?? '', /"decision":"block".*gate failed/);
  assert.equal(warned.length, 0);

  run(() => stop({ agent_type: 'oracle', agent_transcript_path: missing, stop_hook_active: true }), (text) => written.push(text), (message) => warned.push(message));
  assert.equal(written.length, 2);
  assert.match(warned[0] ?? '', /gate failed/);
});

test('a text block without text adds nothing, and text blocks are joined by a newline', () => {
  const content = [{ type: 'text' }, { type: 'text', text: 'a' }, { type: 'text', text: 'b' }];

  assert.equal(lastAssistantText(JSON.stringify({ type: 'assistant', message: { content } })), '\na\nb');
});

test('an assistant message without content reads as empty', () => {
  assert.equal(lastAssistantText(JSON.stringify({ type: 'assistant', message: {} })), '');
});

test('blank space around the transcript does not count as a half-written line', () => {
  const said = JSON.stringify({ type: 'assistant', message: { content: 'answer' } });

  assert.equal(lastAssistantText(`\n${said}\n`), 'answer');
});

test('a record after the last assistant message is not part of the answer', () => {
  const transcript = [
    JSON.stringify({ type: 'assistant', message: { content: 'answer' } }),
    JSON.stringify({ type: 'user', message: { content: 'question' } }),
  ].join('\n');

  assert.equal(lastAssistantText(transcript), 'answer');
});

test('an empty report is never checked against the store', () => {
  const untouchable: Corpus = {
    minWords: 6,
    grams: new Map(),
    get phrases(): readonly string[] {
      throw new Error('the store was read');
    },
  };

  assert.equal(review(parseHookInput({ hook_event_name: 'PreToolUse', tool_name: 'SubagentHandback', tool_input: {}, agent_type: 'oracle' }), untouchable), undefined);
  assert.equal(review(parseHookInput({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { message: copied }, agent_type: 'oracle' }), untouchable), undefined);
  assert.equal(review(stop({ agent_type: 'oracle' }), untouchable), undefined);
});

test('the reason counts the runs and lists each position, separated by semicolons', () => {
  const reason = review(handback('the quick brown fox jumps over and so lazy dog while the cat watches'), corpus()) ?? '';

  assert.match(
    reason,
    /^oracle-hand-back: your report shares 2 verbatim run\(s\) of 6\+ words with the store, at words 1-6 \(6 words, entry book\); words 9-14 \(6 words, entry book\) \(word positions in your report\)\. Nothing was delivered\. Rewrite each listed passage in your own words and send the whole report again\. Names of works, principles and patterns are fine; the wording around them is not\. If a passage cannot be said differently, replace it with "\[withheld: source wording\]"\.$/,
  );
});

test('a transcript with no assistant message and an unparsable line before the last fails the check', () => {
  assert.throws(() => lastAssistantText(['{"type":"assist', JSON.stringify({ type: 'user', message: { content: 'q' } })].join('\n')), /could not be parsed/);
});

test('a copying hand-back is denied through the write callback', () => {
  const written: string[] = [];

  run(() => handback(copied), (text) => written.push(text), () => undefined, corpus());

  assert.equal(written.length, 1);
  assert.match(written[0] ?? '', /"permissionDecision":"deny".*verbatim run/);
});

test('run as a command, the hook denies on stdout when its input cannot be read', () => {
  const result = spawnSync(process.execPath, [join(import.meta.dirname, 'oracle-hand-back.ts')], { input: 'not json', encoding: 'utf8' });

  assert.match(result.stdout, /"permissionDecision":"deny".*gate failed/);
});

test('run as a command, the hook warns on stderr, one line, when it lets a second stop through', () => {
  const input = { hook_event_name: 'SubagentStop', agent_type: 'oracle', agent_transcript_path: join(tmpdir(), 'no-such-transcript.jsonl'), stop_hook_active: true };
  const result = spawnSync(process.execPath, [join(import.meta.dirname, 'oracle-hand-back.ts')], { input: JSON.stringify(input), encoding: 'utf8' });

  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^oracle-hand-back: the gate failed \(.*\)\.\n$/);
});
