import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { decide, storePath } from '../.claude/hooks/oracle-guard.mjs';
import { review } from '../.claude/hooks/oracle-hand-back.mjs';
import { findRuns, loadCorpus, storeDir, tokenize } from './source-overlap.mjs';

const call = (tool_name, tool_input, agent_type) => decide({ tool_name, tool_input, agent_type });

test('the guard denies the driver and other agents any route into the store', () => {
  assert.match(call('Read', { file_path: 'D:\\repo\\.oracle\\metz-talks\\index.md' }), /oracle-guard/);
  assert.match(call('Glob', { pattern: '.oracle/**/*.md' }), /oracle-guard/);
  assert.match(call('Grep', { pattern: 'x', path: '.oracle' }), /oracle-guard/);
  assert.match(call('Bash', { command: 'cat .oracle/99-bottles/index.md' }), /oracle-guard/);
  assert.match(call('PowerShell', { command: 'Get-Content .ORACLE\\x.md' }), /oracle-guard/);
  assert.match(call('Write', { file_path: '.oracle/new.md', content: 'x' }), /oracle-guard/);
  assert.match(call('Read', { file_path: '.oracle/99-bottles/index.md' }, 'general-purpose'), /oracle-guard/);
  assert.match(call('Bash', { command: 'node tools/source-overlap.mjs x.md | cat .oracle/a.md' }), /oracle-guard/);
  assert.match(call('mcp__fs__read_file', { path: '/repo/.oracle/a.md' }), /oracle-guard/);
});

test('the guard lets the permitted routes through', () => {
  assert.equal(call('Read', { file_path: '.oracle/99-bottles/index.md' }, 'oracle'), undefined);
  assert.equal(call('Glob', { pattern: '*.md', path: '.oracle/metz-talks' }, 'oracle-reviewer'), undefined);
  assert.equal(call('Bash', { command: 'cp a.md .oracle/metz-written/a.md' }, 'oracle-curator'), undefined);
  assert.equal(call('Read', { file_path: '.oracle/README.md' }), undefined);
  assert.equal(call('Bash', { command: 'node tools/source-overlap.mjs --min-words 6 draft.md' }), undefined);
  assert.equal(call('Write', { file_path: 'AGENTS.md', content: 'keep out of .oracle/' }), undefined);
  assert.equal(call('Grep', { pattern: '\\.oracle', path: 'AGENTS.md' }), undefined);
  assert.equal(call('Read', { file_path: 'tools/oracle-hooks.test.mjs' }), undefined);
});

test('a reader agent gets no tool but Read and Glob on the store', () => {
  assert.match(call('Bash', { command: 'cat .oracle/a.md' }, 'oracle'), /oracle-guard/);
});

function syntheticCorpus(minWords) {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-'));
  mkdirSync(join(dir, 'book'));
  writeFileSync(
    join(dir, 'book', 'ch1.md'),
    'the quick brown fox jumps over the lazy dog while the cat watches from the old red barn. ' +
      'Sing 99 bottles of beer on the wall and take one down and pass it around today.',
  );
  writeFileSync(join(dir, 'book', 'index.md'), 'alpha beta gamma delta epsilon zeta eta theta');
  mkdirSync(join(dir, 'metz-talks'));
  writeFileSync(join(dir, 'metz-talks', 't1.md'), '# Seven Small Objects Walk Into A Bar\n\nA transcript follows here with many more words after it.');
  writeFileSync(
    join(dir, 'metz-talks', 'index.md'),
    '| Talk | File |\n| --- | --- |\n| Seven Small Objects Walk Into A Bar (Venue) | `t1.md` |\n',
  );

  return loadCorpus(minWords, dir);
}

test('overlap finds a copied run by position and never by text', () => {
  const runs = findRuns('Intro words. The quick brown fox jumps over the lazy dog, I said.', syntheticCorpus(6));

  assert.deepEqual(runs, [{ start: 3, words: 9, entry: 'book' }]);
});

test('overlap ignores short runs, permitted phrases and index files', () => {
  const corpus = syntheticCorpus(6);

  assert.deepEqual(findRuns('the quick brown fox jumps', corpus), []);
  assert.deepEqual(findRuns('99 bottles of beer on the wall and take one down and pass it around', corpus), []);
  assert.deepEqual(findRuns('alpha beta gamma delta epsilon zeta eta theta', corpus), []);
  assert.deepEqual(findRuns('In her talk Seven Small Objects Walk Into A Bar, she argues.', corpus), []);
  assert.deepEqual(
    findRuns('seven small objects walk into a bar a transcript follows here with many more words after it', corpus),
    [{ start: 2, words: 10, entry: 'metz-talks' }],
  );
});

test('the hand-back gate blocks an oracle answer that copies, and passes one that does not', () => {
  const corpus = syntheticCorpus(6);
  const copied = { agent_type: 'oracle', last_assistant_message: 'It says the quick brown fox jumps over the lazy dog.' };

  assert.match(review(copied, corpus), /words 3-11 \(9 words, entry book\)/);
  assert.match(review({ ...copied, stop_hook_active: true }, corpus), /already sent back once/);
  assert.equal(review({ agent_type: 'oracle', last_assistant_message: 'A fox leaps a sleepy hound.' }, corpus), undefined);
  assert.equal(review({ ...copied, agent_type: 'general-purpose' }, corpus), undefined);
});

test('the hand-back gate reads a SubagentHandback report, where SubagentStop has no last message', () => {
  const corpus = syntheticCorpus(6);
  const handback = (message, agent_type = 'oracle') => ({
    hook_event_name: 'PreToolUse',
    tool_name: 'SubagentHandback',
    tool_input: { message },
    agent_type,
  });

  assert.match(review(handback('It says the quick brown fox jumps over the lazy dog.'), corpus), /Nothing was delivered/);
  assert.equal(review(handback('A fox leaps a sleepy hound.'), corpus), undefined);
  assert.equal(review(handback('the quick brown fox jumps over the lazy dog', 'haiku-low'), corpus), undefined);
  assert.equal(review({ hook_event_name: 'SubagentStop', agent_type: 'oracle' }, corpus), undefined);
});

test('the real store loads and a run lifted from it is caught', () => {
  const corpus = loadCorpus(6);
  const file = readdirSync(join(storeDir, 'metz-talks')).find((name) => name !== 'index.md');
  const tokens = tokenize(readFileSync(join(storeDir, 'metz-talks', file), 'utf8'));
  const start = Math.floor(tokens.length / 2);
  const lifted = tokens.slice(start, start + 10).join(' ');

  assert.ok(corpus.grams.size > 100000, 'store corpus is loaded');
  assert.equal(findRuns(`my own opening words ${lifted} my own closing words`, corpus)[0]?.entry, 'metz-talks');
});

test('the mod scrubs with the same store pattern the guard denies on', () => {
  const mod = readFileSync(new URL('../.claude/mods/oracle-scrub/hooks/register.ts', import.meta.url), 'utf8');

  assert.ok(mod.includes(`const storePath = ${storePath}`), 'pattern copies agree');
});
