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

const lifted = 'one two three four five six seven eight';

// A store whose only run of text sits in the named file.
function storeWith(path: string, content: string = lifted): string {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-'));
  const file = join(dir, ...path.split('/'));
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);

  return dir;
}

test('a run copied from example code is found', () => {
  assert.equal(findRuns(lifted, loadCorpus(6, storeWith('book/code.js'))).length, 1);
});

test('a run from a README.md inside an entry is found', () => {
  assert.equal(findRuns(lifted, loadCorpus(6, storeWith('metz-written/github/repo/README.md'))).length, 1);
});

test("the store's own listing is not a work", () => {
  assert.equal(findRuns(lifted, loadCorpus(6, storeWith('README.md'))).length, 0);
  assert.equal(findRuns(lifted, loadCorpus(6, storeWith('book/index.md'))).length, 0);
  assert.equal(findRuns(lifted, loadCorpus(6, storeWith('book/repo/index.md'))).length, 1);
});

test("a clone's git folder is not read", () => {
  assert.equal(findRuns(lifted, loadCorpus(6, storeWith('99bottles-js/repo/.git/x.md'))).length, 0);
});

test('installed dependencies are not read', () => {
  assert.equal(findRuns(lifted, loadCorpus(6, storeWith('99bottles-js/repo/node_modules/lib/index.js'))).length, 0);
});

test('lock files and other file types are not read, prose and code of every listed kind is', () => {
  for (const path of ['repo/package-lock.json', 'repo/yarn.lock', 'repo/pnpm-lock.yaml', 'repo/data.json', 'repo/a.png']) {
    assert.equal(findRuns(lifted, loadCorpus(6, storeWith(`book/${path}`))).length, 0, path);
  }

  for (const extension of ['md', 'txt', 'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'rb', 'RB']) {
    assert.equal(findRuns(lifted, loadCorpus(6, storeWith(`book/a.${extension}`))).length, 1, extension);
  }
});

test('a file holding a NUL byte is not read', () => {
  assert.equal(findRuns(lifted, loadCorpus(6, storeWith('book/a.txt', `${lifted}\u0000`))).length, 0);
});

// A talks entry whose index holds the given table and whose one talk holds the run.
function talksWithIndex(table: string, talk: string): string {
  const dir = storeWith('metz-talks/t.md', talk);
  writeFileSync(join(dir, 'metz-talks', 'index.md'), table);

  return dir;
}

test('a one-word index title does not mask that word', () => {
  const dir = talksWithIndex('| Talk | File |\n| --- | --- |\n| Again | `t.md` |\n', 'one two three again four five six');

  assert.equal(findRuns('one two three again four five six', loadCorpus(6, dir)).length, 1);
});

test('a numeric index cell does not mask those numbers', () => {
  const dir = talksWithIndex('| Talk | File |\n| --- | --- |\n| 20 16 | `t.md` |\n', 'one two three 20 16 four five six');

  assert.equal(findRuns('one two three 20 16 four five six', loadCorpus(6, dir)).length, 1);
});

test('a header row is never a title', () => {
  const dir = talksWithIndex('| Talk Title | File |\n| --- | --- |\n| Some Talk | `t.md` |\n', 'one two talk title four five six');

  assert.equal(findRuns('one two talk title four five six', loadCorpus(6, dir)).length, 1);
});

test('titles come from the title column, not from another first column', () => {
  const dir = talksWithIndex(
    '| Venue Name | Title | File |\n| --- | --- | --- |\n| Big Conf | Small Objects Walk Far | `t.md` |\n',
    'one two big conf three four five six seven and small objects walk far as before',
  );
  const corpus = loadCorpus(6, dir);

  assert.equal(findRuns('one two big conf three four five six seven', corpus).length, 1);
  assert.deepEqual(findRuns('seven and small objects walk far as before', corpus), []);
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

test('a draft that cannot be read is an error, exit 2, not an overlap', (t) => {
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main([join(tmpdir(), 'no-such-draft.md')], syntheticStore()), 2);
});

test('the other drafts are still checked when one cannot be read', (t) => {
  const printed: string[] = [];
  const copy = join(mkdtempSync(join(tmpdir(), 'oracle-drafts-')), 'copy.md');
  writeFileSync(copy, 'the quick brown fox jumps over the lazy dog');
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main(['--min-words', '6', join(tmpdir(), 'no-such-draft.md'), copy], syntheticStore()), 2);
  assert.ok(printed.some((line) => line.startsWith(`${copy}: words 1-9`)));
  assert.ok(printed.some((line) => /no-such-draft\.md: cannot read it/.test(line)));
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
