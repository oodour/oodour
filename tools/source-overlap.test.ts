import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { describeRuns, findRuns, loadCorpus, main, parseArgs, permittedPhrases, tokenize } from './source-overlap.ts';

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

// Every string a script that holds the value can reach: keys, values, and the contents of maps and sets.
function reachableStrings(value: unknown, seen: Set<unknown> = new Set()): readonly string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return [];
  }

  seen.add(value);
  const keys = Reflect.ownKeys(value);
  const values: readonly unknown[] = keys.map((key): unknown => Reflect.get(value, key));
  const contents: readonly unknown[] = value instanceof Map || value instanceof Set ? [...value.entries()].flat() : [];

  return [...keys, ...values, ...contents].flatMap((child) => reachableStrings(child, seen));
}

test('a loaded corpus holds none of the words it was loaded from', () => {
  const corpus = loadCorpus(6, syntheticStore());

  assert.equal(findRuns('the quick brown fox jumps over', corpus).length, 1);
  assert.deepEqual(reachableStrings(corpus).filter((text) => /quick|seven small/i.test(text)), []);
});

test('the module exports no file system path', async () => {
  const exported = Object.values(await import('./source-overlap.ts'));

  assert.deepEqual(exported.filter((value) => typeof value === 'string' && isAbsolute(value)), []);
});

test('a corpus that loadCorpus did not return is refused', () => {
  assert.throws(() => findRuns('the quick brown fox jumps over', { minWords: 6 }), /not a corpus that loadCorpus returned/);
});

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
  assert.throws(() => loadCorpus(5, store), /at least 6 words/);
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
  assert.equal(parseArgs(['--min-words', '4', 'a.md']), undefined);
  assert.equal(parseArgs(['--min-words', '5', 'a.md']), undefined);
  assert.equal(parseArgs(['--min-words', 'six', 'a.md']), undefined);
});

test('a corpus folder outside the store can be named instead of the store', () => {
  assert.deepEqual(parseArgs(['--corpus', 'D:/handbook', 'a.md']), { minWords: 8, files: ['a.md'], corpus: 'D:/handbook' });
  assert.equal(parseArgs(['--corpus', 'a.md']), undefined);
});

test('a --corpus with no folder after it is refused, not read as the store', () => {
  assert.equal(parseArgs(['a.md', '--corpus']), undefined);
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

test('a corpus folder with no text files in it is refused with exit 2, not reported clean', (t) => {
  const empty = mkdtempSync(join(tmpdir(), 'open-corpus-'));
  const dir = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const draft = join(dir, 'draft.md');
  writeFileSync(draft, 'A fox leaps a sleepy hound.');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main(['--corpus', empty, draft]), 2);
  assert.ok(!printed.some((line) => line.startsWith('[OK]')), 'no clean verdict is printed');
});

test('a corpus folder that does not exist is refused with exit 2, not thrown as an overlap', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const draft = join(dir, 'draft.md');
  writeFileSync(draft, 'A fox leaps a sleepy hound.');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main(['--corpus', join(dir, 'missing'), draft]), 2);
  assert.deepEqual(printed, [`[ERROR] ${join(dir, 'missing')}: not a folder with text files to compare against`]);
});

test('a corpus folder inside the store is refused, so no file name inside an entry is printed', (t) => {
  const store = syntheticStore();
  const dir = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const copy = join(dir, 'copy.md');
  writeFileSync(copy, 'the quick brown fox jumps over the lazy dog');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main(['--corpus', join(store, 'book'), copy], store), 2);
  assert.equal(main(['--corpus', store, copy], store), 2);
  assert.equal(
    printed.at(-1),
    '[ERROR] --corpus names the store or a folder inside it; leave --corpus out to check against the store',
  );
});

test('a folder named as a draft checks every text file below it', (t) => {
  const drafts = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  mkdirSync(join(drafts, 'case'));
  writeFileSync(join(drafts, 'case', 'prompt.md'), 'the quick brown fox jumps over the lazy dog');
  writeFileSync(join(drafts, 'clean.md'), 'A fox leaps a sleepy hound.');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main(['--min-words', '6', drafts], syntheticStore()), 1);
  assert.deepEqual(printed, [`${join(drafts, 'case', 'prompt.md')}: words 1-9 (9 words, entry book)`, '[ERROR] 1 run(s)']);
});

test('a draft folder inside the store or holding it is refused, so no file name inside an entry is printed', (t) => {
  const parent = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const store = join(parent, 'store');
  cpSync(syntheticStore(), store, { recursive: true });
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  const draft = join(mkdtempSync(join(tmpdir(), 'oracle-draft-')), 'draft.md');
  writeFileSync(draft, 'a plain draft');

  assert.equal(main([join(store, 'book')], store), 2);
  assert.equal(main([parent], store), 2);
  assert.equal(main([draft, parent], store), 2);
  assert.deepEqual(printed, [
    '[ERROR] a draft folder names the store, a folder inside it, or a folder that holds it',
    '[ERROR] a draft folder names the store, a folder inside it, or a folder that holds it',
    '[ERROR] a draft folder names the store, a folder inside it, or a folder that holds it',
  ]);
});

test('a draft folder that is a link to the store or to a folder holding it is refused too', (t) => {
  const parent = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const store = join(parent, 'store');
  cpSync(syntheticStore(), store, { recursive: true });
  const links = mkdtempSync(join(tmpdir(), 'oracle-links-'));
  symlinkSync(store, join(links, 'to-store'), 'junction');
  symlinkSync(parent, join(links, 'to-parent'), 'junction');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main([join(links, 'to-store')], store), 2);
  assert.equal(main([join(links, 'to-parent')], store), 2);
  assert.deepEqual(printed, [
    '[ERROR] a draft folder names the store, a folder inside it, or a folder that holds it',
    '[ERROR] a draft folder names the store, a folder inside it, or a folder that holds it',
  ]);
});

test('a draft folder named by its short 8.3 path is refused like its long path', (t) => {
  const parent = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const longParent = realpathSync.native(parent);

  if (longParent.toLowerCase() === parent.toLowerCase()) {
    t.skip('the temporary folder has no short 8.3 name on this machine');

    return;
  }

  const store = join(longParent, 'store');
  cpSync(syntheticStore(), store, { recursive: true });
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main([parent], store), 2);
  assert.deepEqual(printed, ['[ERROR] a draft folder names the store, a folder inside it, or a folder that holds it']);
});

test('a draft folder with no text files in it is an error, exit 2, not reported clean', (t) => {
  const drafts = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  writeFileSync(join(drafts, 'case.yaml'), 'runs: 3');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main([drafts], syntheticStore()), 2);
  assert.deepEqual(printed, [`[ERROR] ${drafts}: a draft folder with no text files to check`]);
});

test('a corpus folder that holds the store is checked, not refused as inside it', (t) => {
  const parent = mkdtempSync(join(tmpdir(), 'open-corpus-'));
  const store = join(parent, 'store');
  mkdirSync(store);
  writeFileSync(join(parent, 'page.md'), 'nothing in common with the draft at all here');
  const draft = join(mkdtempSync(join(tmpdir(), 'oracle-drafts-')), 'clean.md');
  writeFileSync(draft, 'A fox leaps a sleepy hound.');
  t.mock.method(console, 'log', () => undefined);
  t.mock.method(console, 'error', () => undefined);

  assert.equal(main(['--corpus', parent, draft], store), 0);
});

test('with --corpus the command checks against that folder instead of the store', (t) => {
  const other = mkdtempSync(join(tmpdir(), 'open-corpus-'));
  mkdirSync(join(other, 'guide'));
  writeFileSync(join(other, 'guide', 'page.md'), 'every class should own one reason to change in the code base');
  const dir = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const copy = join(dir, 'copy.md');
  writeFileSync(copy, 'They said every class should own one reason to change in practice.');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));

  assert.equal(main(['--corpus', other, copy], syntheticStore()), 1);
  assert.equal(main([copy], syntheticStore()), 0);
  assert.ok(printed.includes(`${copy}: words 3-11 (9 words, entry guide)`));
});

test('with --corpus a clean verdict names the folder it checked, and the usage shows the option', (t) => {
  const other = mkdtempSync(join(tmpdir(), 'open-corpus-'));
  writeFileSync(join(other, 'page.md'), 'nothing in common with the draft at all here');
  const draft = join(mkdtempSync(join(tmpdir(), 'oracle-drafts-')), 'clean.md');
  writeFileSync(draft, 'A fox leaps a sleepy hound.');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  assert.equal(main(['--corpus', other, draft], syntheticStore()), 0);
  main([], syntheticStore());

  assert.deepEqual(printed, [
    `[OK] no run of 8+ words shared with ${other}`,
    'usage: node tools/source-overlap.ts [--min-words N>=6] [--corpus <folder>] <file or folder> [more]',
  ]);
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

test('only the listing at the store root and an index at the top of an entry are skipped', () => {
  for (const path of ['notes.md', 'README.md/a.md', 'book/index.md/a.md']) {
    assert.equal(findRuns(lifted, loadCorpus(6, storeWith(path))).length, 1, path);
  }
});

test('a line is a separator only when it is all separator cells', () => {
  const title = '| Talk | File |\n| --- | --- |\n| Patient Gardens Grow Slowly | `t.md` |\n';
  const talk = 'one two patient gardens grow slowly three four';

  for (const after of ['note |---|', '|---|x']) {
    assert.deepEqual(findRuns(talk, loadCorpus(6, talksWithIndex(`${title}${after}\n`, talk))), [], after);
  }
});

test('an indented table row is read like any other', () => {
  const dir = talksWithIndex('| Talk | File |\n| --- | --- |\n  | Patient Gardens Grow Slowly | `t.md` |\n', 'one two patient gardens grow slowly three four');

  assert.deepEqual(findRuns('one two patient gardens grow slowly three four', loadCorpus(6, dir)), []);
});

test('a two-word title with a number in it is a name', () => {
  const dir = talksWithIndex('| Talk | File |\n| --- | --- |\n| Gardens 2016 | `t.md` |\n', 'one two three gardens 2016 four five six');

  assert.deepEqual(findRuns('one two three gardens 2016 four five six', loadCorpus(6, dir)), []);
});

test('every permitted phrase is a name inside a copied run', () => {
  for (const phrase of permittedPhrases) {
    const text = `one two three ${phrase} four five six`;

    assert.deepEqual(findRuns(text, loadCorpus(6, storeWith('book/a.md', text))), [], phrase);
  }
});

test('text without words has no tokens, and an apostrophe joins whole word parts', () => {
  assert.deepEqual(tokenize('-- ... --'), []);
  assert.deepEqual(tokenize("o'clock rock'n'roll"), ["o'clock", "rock'n'roll"]);
});

test('a compact separator row still marks the header', () => {
  const dir = talksWithIndex(
    '| Venue Name | Title | File |\n|---|---|---|\n| Big Conf | Small Objects Walk Far | `t.md` |\n',
    'one two big conf three four five six seven and small objects walk far as before',
  );
  const corpus = loadCorpus(6, dir);

  assert.equal(findRuns('one two big conf three four five six seven', corpus).length, 1);
  assert.deepEqual(findRuns('seven and small objects walk far as before', corpus), []);
});

test('prose lines in an index are not titles, and a row without a closing pipe is', () => {
  const prose = talksWithIndex('one two three four\n\n| Talk | File |\n| --- | --- |\n| Some Talk | `t.md` |\n', 'one two three four five six');

  assert.equal(findRuns('one two three four five six', loadCorpus(6, prose)).length, 1);

  const open = talksWithIndex('| Talk | File |\n| --- | --- |\n| Patient Gardens Grow Slowly | `t.md`\n', 'one two patient gardens grow slowly three four');

  assert.deepEqual(findRuns('one two patient gardens grow slowly three four', loadCorpus(6, open)), []);
});

test('the title column is the header cell that is exactly Title or Talk', () => {
  const dir = talksWithIndex(
    '| Talk Venue | Keynote Talk | Title | File |\n| --- | --- | --- | --- |\n| Big Conf | Main Hall | Small Objects Walk Far | `t.md` |\n',
    'one two big conf three four and one two main hall three four and small objects walk far as before',
  );
  const corpus = loadCorpus(6, dir);

  assert.equal(findRuns('one two big conf three four', corpus).length, 1);
  assert.equal(findRuns('one two main hall three four', corpus).length, 1);
  assert.deepEqual(findRuns('and small objects walk far as before', corpus), []);
});

test('a title is also a name without its trailing parenthesis, and only a trailing one', () => {
  const glued = talksWithIndex('| Talk | File |\n| --- | --- |\n| Patient Gardens Grow(Venue) | `t.md` |\n', 'patient gardens grow one two three four five');

  assert.deepEqual(findRuns('patient gardens grow one two three four five', loadCorpus(6, glued)), []);

  const inner = talksWithIndex('| Talk | File |\n| --- | --- |\n| Deep Roots (Live) - Hold Fast | `t.md` |\n', 'deep roots hold fast one two three four');

  assert.equal(findRuns('deep roots hold fast one two three four', loadCorpus(6, inner)).length, 1);
});

test('a parenthesis followed by more of the title is kept', () => {
  const dir = talksWithIndex('| Talk | File |\n| --- | --- |\n| Patient Gardens (Live)Grow | `t.md` |\n', 'one two three patient gardens four five six');

  assert.equal(findRuns('one two three patient gardens four five six', loadCorpus(6, dir)).length, 1);
});

test('a run found in two entries belongs to the first entry read', () => {
  const dir = storeWith('a-entry/x.md');
  mkdirSync(join(dir, 'b-entry'));
  writeFileSync(join(dir, 'b-entry', 'x.md'), lifted);
  const first = readdirSync(dir)[0];

  assert.equal(findRuns(lifted, loadCorpus(6, dir))[0]?.entry, first);
});

test('the command prints its usage, its verdict and its run count', (t) => {
  const store = syntheticStore();
  const dir = mkdtempSync(join(tmpdir(), 'oracle-drafts-'));
  const clean = join(dir, 'clean.md');
  const copy = join(dir, 'copy.md');
  writeFileSync(clean, 'A fox leaps a sleepy hound.');
  writeFileSync(copy, 'the quick brown fox jumps over the lazy dog');
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));

  main([clean], store);
  main(['--min-words', '6', copy], store);
  main([], store);

  assert.deepEqual(printed, [
    '[OK] no run of 8+ words shared with the store',
    `${copy}: words 1-9 (9 words, entry book)`,
    '[ERROR] 1 run(s)',
    'usage: node tools/source-overlap.ts [--min-words N>=6] [--corpus <folder>] <file or folder> [more]',
  ]);
});

test('run as a command with no arguments, it prints its usage and exits 2', () => {
  const run = spawnSync(process.execPath, [join(import.meta.dirname, 'source-overlap.ts')], { encoding: 'utf8' });

  assert.equal(run.status, 2);
  assert.match(run.stderr, /^usage: /);
});

const repositoryStore = join(dirname(import.meta.dirname), '.oracle');

// Mutation runs copy the repository without its store and skip the real-store test, so this pins the default there.
test(
  'with no store present, loading the default corpus names the missing store folder at the repository root',
  { skip: existsSync(repositoryStore) && 'the store is present, and the real-store test covers the default' },
  () => {
    assert.throws(() => loadCorpus(6), (error: unknown) => error instanceof Error && error.message.includes(repositoryStore));
  },
);

test('the real store loads and a run lifted from it is caught', () => {
  const corpus = loadCorpus(6);
  const file = readdirSync(join(repositoryStore, 'metz-talks')).find((name) => name.endsWith('.md') && name !== 'index.md') ?? '';
  const tokens = tokenize(readFileSync(join(repositoryStore, 'metz-talks', file), 'utf8'));
  const start = Math.floor(tokens.length / 2);
  const lifted = tokens.slice(start, start + 10).join(' ');

  assert.equal(findRuns(`my own opening words ${lifted} my own closing words`, corpus)[0]?.entry, 'metz-talks');
});
