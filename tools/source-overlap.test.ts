import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { describeRuns, findRuns, loadCorpus, main, parseArgs, storeDir, tokenize } from './source-overlap.ts';

function syntheticStore(): string {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-'));
  mkdirSync(join(dir, 'book'));
  writeFileSync(
    join(dir, 'book', 'ch1.md'),
    'the quick brown fox jumps over the lazy dog while the cat watches from the old red barn. ' +
      'Sing 99 bottles of beer on the wall and take one down and pass it around today.',
  );
  writeFileSync(
    join(dir, 'book', 'index.md'),
    'alpha beta gamma delta epsilon zeta eta theta\n\n| Title | File |\n| --- | --- |\n| The Quick Brown Fox Jumps Over | `ch1.md` |\n',
  );
  mkdirSync(join(dir, 'metz-talks'));
  writeFileSync(join(dir, 'metz-talks', 't1.md'), '# Seven Small Objects Walk Into A Bar\n\nA transcript follows here with many more words after it.');
  writeFileSync(
    join(dir, 'metz-talks', 'index.md'),
    '| Talk | File |\n| --- | --- |\n| Seven Small Objects Walk Into A Bar (Venue) | `t1.md` |\n',
  );

  return dir;
}

test('a copied run is found by position and length, never by text', () => {
  const runs = findRuns('Intro words. The quick brown fox jumps over the lazy dog, I said.', loadCorpus(6, syntheticStore()));

  assert.deepEqual(runs, [{ start: 3, words: 9, entry: 'book' }]);
  assert.deepEqual(describeRuns(runs), ['words 3-11 (9 words, entry book)']);
});

test('two separate copied runs are reported separately', () => {
  const runs = findRuns('the quick brown fox jumps over then mine then the cat watches from the old red', loadCorpus(6, syntheticStore()));

  assert.deepEqual(runs, [
    { start: 1, words: 6, entry: 'book' },
    { start: 10, words: 7, entry: 'book' },
  ]);
});

test('a run is found at exactly the threshold and not one word below it', () => {
  const store = syntheticStore();

  assert.equal(findRuns('the quick brown fox jumps over', loadCorpus(6, store)).length, 1);
  assert.equal(findRuns('the quick brown fox jumps', loadCorpus(6, store)).length, 0);
});

test('permitted phrases, index files and a book index title are handled as names or skipped', () => {
  const corpus = loadCorpus(6, syntheticStore());

  assert.deepEqual(findRuns('99 bottles of beer on the wall and take one down and pass it around', corpus), []);
  assert.deepEqual(findRuns('alpha beta gamma delta epsilon zeta eta theta', corpus), []);
  assert.equal(findRuns('the quick brown fox jumps over', corpus).length, 1, 'a book index title is not a permitted name');
});

test('a talk title listed in its index is a name, and the words after it still count', () => {
  const corpus = loadCorpus(6, syntheticStore());

  assert.deepEqual(findRuns('In her talk Seven Small Objects Walk Into A Bar, she argues.', corpus), []);
  assert.deepEqual(findRuns('seven small objects walk into a bar a transcript follows here with many more words after it', corpus), [
    { start: 8, words: 10, entry: 'metz-talks' },
  ]);
});

test('positions count the words of a permitted phrase before a run', () => {
  const runs = findRuns('Sandi Metz Katrina Owen the quick brown fox jumps over', loadCorpus(6, syntheticStore()));

  assert.deepEqual(describeRuns(runs), ['words 5-10 (6 words, entry book)']);
});

test('a talk title in the co-author talks index is a name too', () => {
  const dir = syntheticStore();
  mkdirSync(join(dir, 'owen-talks'));
  writeFileSync(join(dir, 'owen-talks', 'k1.md'), '# Patient Gardens Grow Slowly Under Careful Hands\n\nSome other words follow.');
  writeFileSync(join(dir, 'owen-talks', 'index.md'), '| Talk | File |\n| --- | --- |\n| Patient Gardens Grow Slowly Under Careful Hands | `k1.md` |\n');

  assert.deepEqual(findRuns('Her talk Patient Gardens Grow Slowly Under Careful Hands was good.', loadCorpus(6, dir)), []);
});

test('curly apostrophes and case do not hide a copy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-'));
  mkdirSync(join(dir, 'book'));
  writeFileSync(join(dir, 'book', 'a.md'), "it's the code that we don't want to keep around");

  assert.equal(findRuns('IT’S THE CODE THAT WE DON’T WANT', loadCorpus(6, dir)).length, 1);
  assert.deepEqual(tokenize("Don’t stop"), ["don't", 'stop']);
});

test('single quotes around a copied run do not hide it', () => {
  assert.equal(findRuns("She wrote 'the quick brown fox jumps over' once.", loadCorpus(6, syntheticStore())).length, 1);
});

test('an apostrophe counts only inside a word', () => {
  assert.deepEqual(tokenize("'one two' don't 'tis ''"), ['one', 'two', "don't", 'tis']);
  assert.equal(findRuns("the quick brown 'fox jumps over'", loadCorpus(6, syntheticStore())).length, 1);
});

test('compatibility characters in a copy do not hide it', () => {
  assert.equal(findRuns('the ｑｕｉｃｋ brown fox jumps over', loadCorpus(6, syntheticStore())).length, 1);
});

test('compatibility characters in the store are normalized too', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-'));
  mkdirSync(join(dir, 'book'));
  writeFileSync(join(dir, 'book', 'a.md'), 'we ﬁnd the ﬁrst ﬁx that ﬁts');

  assert.equal(findRuns('we find the first fix that fits', loadCorpus(6, dir)).length, 1);
});

test('arguments parse into a threshold and files, and bad usage is refused', () => {
  assert.deepEqual(parseArgs(['a.md']), { minWords: 8, files: ['a.md'] });
  assert.deepEqual(parseArgs(['--min-words', '6', 'a.md', 'b.md']), { minWords: 6, files: ['a.md', 'b.md'] });
  assert.equal(parseArgs([]), undefined);
  assert.equal(parseArgs(['--min-words', '3', 'a.md']), undefined);
  assert.equal(parseArgs(['--min-words', 'six', 'a.md']), undefined);
});

test('the command exits 0 when clean, 1 on overlap and 2 on bad usage', (t) => {
  const store = syntheticStore();
  const dir = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const clean = join(dir, 'clean.md');
  const copy = join(dir, 'copy.md');
  writeFileSync(clean, 'A fox leaps a sleepy hound.');
  writeFileSync(copy, 'the quick brown fox jumps over the lazy dog');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main([clean], store), 0);
  assert.equal(main(['--min-words', '6', copy], store), 1);
  assert.equal(main([], store), 2);
  assert.ok(printed.every((line) => !line.includes('quick brown')), 'no matched text is printed');
});

test('the real store loads and a run lifted from it is caught', () => {
  const corpus = loadCorpus(6);
  const file = readdirSync(join(storeDir, 'metz-talks')).find((name) => name.endsWith('.md') && name !== 'index.md') ?? '';
  const tokens = tokenize(readFileSync(join(storeDir, 'metz-talks', file), 'utf8'));
  const start = Math.floor(tokens.length / 2);
  const lifted = tokens.slice(start, start + 10).join(' ');

  assert.ok(corpus.grams.size > 100000, 'store corpus is loaded');
  assert.equal(findRuns(`my own opening words ${lifted} my own closing words`, corpus)[0]?.entry, 'metz-talks');
});
