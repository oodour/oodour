import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkEntry, describe, indexedPaths, main } from './store-check.ts';

function store(): string {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-check-'));
  mkdirSync(join(dir, 'metz-written', 'github', 'poodr'), { recursive: true });
  writeFileSync(join(dir, 'metz-written', 'a.md'), 'body');
  writeFileSync(join(dir, 'metz-written', 'empty.md'), '');
  writeFileSync(join(dir, 'metz-written', 'stray.md'), 'body');
  writeFileSync(join(dir, 'metz-written', 'github', 'poodr', 'x.rb'), 'code');
  writeFileSync(
    join(dir, 'metz-written', 'index.md'),
    [
      'Intro mentioning `not-a-row.md`.',
      '| Title | File |',
      '| --- | --- |',
      '| A | `a.md` |',
      '| Empty | `empty.md` |',
      '| Gone | `gone.md` |',
      '| Repo | `github/poodr/` |',
      '| Link | `https://example.com/x` |',
    ].join('\n'),
  );
  mkdirSync(join(dir, 'book'));
  writeFileSync(join(dir, 'book', 'ch1-a-chapter-heading.md'), 'text');
  writeFileSync(join(dir, 'book', 'index.md'), '| Ch | File |\n| --- | --- |\n| 1 | `ch1-a-chapter-heading.md` |\n');

  return dir;
}

test('index cells are the backticked paths of table rows only', () => {
  assert.deepEqual(indexedPaths('see `x.md`\n| a | `b.md` | `c d` | `https://x` | `kind_of?` |\n| `repo/lib` |'), [
    'b.md',
    'repo/lib',
  ]);
});

test('index cells also include relative link targets and bare file cells', () => {
  assert.deepEqual(
    indexedPaths(
      [
        '- [Chapter one](01%20one.md#start)',
        '- [Site](https://example.com/a.md)',
        '| A title | a.md | 2016 |',
        '| Repo | github/poodr/ | n/a |',
        '| Prose | some words here.md |',
      ].join('\n'),
    ),
    ['01 one.md', 'a.md', 'github/poodr/'],
  );
});

test('an entry reports missing, empty and unindexed files', () => {
  assert.deepEqual(checkEntry(store(), 'metz-written'), {
    entry: 'metz-written',
    indexed: 4,
    missing: ['gone.md'],
    empty: ['empty.md'],
    unindexed: ['stray.md'],
  });
});

test('an entry without an index is not an entry', () => {
  const dir = store();
  mkdirSync(join(dir, 'loose'));

  assert.equal(checkEntry(dir, 'loose'), undefined);
});

test('a collection names its problems, a book gives counts alone', () => {
  const dir = store();
  writeFileSync(join(dir, 'book', 'ch2-another-heading.md'), 'text');

  assert.deepEqual(describe(checkEntry(dir, 'metz-written') ?? assert.fail()), [
    '[ERROR] metz-written: 4 indexed, 1 missing, 1 empty, 1 unindexed',
    '  missing: gone.md',
    '  empty: empty.md',
    '  unindexed: stray.md',
  ]);
  assert.deepEqual(describe(checkEntry(dir, 'book') ?? assert.fail()), ['[ERROR] book: 1 indexed, 0 missing, 0 empty, 1 unindexed']);
});

test('a missing cell that is not a file or folder name is counted but not printed', () => {
  const report = { entry: 'metz-talks', indexed: 2, missing: ['gone.md', 'obj.method'], empty: [], unindexed: [] };

  assert.deepEqual(describe(report), ['[ERROR] metz-talks: 2 indexed, 2 missing, 0 empty, 0 unindexed', '  missing: gone.md']);
});

test('a missing folder cell is printed', () => {
  const report = { entry: 'metz-written', indexed: 1, missing: ['github/poodr/', 'github/poodr'], empty: [], unindexed: [] };

  assert.deepEqual(describe(report).slice(1), ['  missing: github/poodr/']);
});

test('links to an anchor or a URL are dropped, and a colon after a path segment is kept', () => {
  assert.deepEqual(indexedPaths('- [Top](#top)\n- [Mail](mailto:x)\n- [Odd](notes/a:b.md)'), ['notes/a:b.md']);
});

test('a row without a closing pipe is still a table row', () => {
  assert.deepEqual(indexedPaths('| A | `a.md`'), ['a.md']);
});

test("a cell resolves against a folder at the top of the entry, such as a clone's repo", () => {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-check-'));
  mkdirSync(join(dir, '99bottles-js', 'repo', 'lib'), { recursive: true });
  writeFileSync(join(dir, '99bottles-js', 'repo', 'lib', 'bottles.js'), 'code');
  writeFileSync(join(dir, '99bottles-js', 'index.md'), '| Code | `lib/bottles.js` |');

  assert.deepEqual(checkEntry(dir, '99bottles-js')?.missing, []);
});

test('a folder cell resolves with any number of trailing separators', () => {
  const dir = store();
  writeFileSync(join(dir, 'metz-written', 'index.md'), '| Repo | `github/poodr//` |\n| A | `a.md` |\n| E | `empty.md` |\n| S | `stray.md` |');

  assert.deepEqual(checkEntry(dir, 'metz-written')?.missing, []);
});

test('a bare cell that is a web address is not a path', () => {
  assert.deepEqual(indexedPaths('| Site | https://example.com/a.md |'), []);
});

test('a cell resolves against folders only, never through a file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-check-'));
  mkdirSync(join(dir, 'metz-written'));
  writeFileSync(join(dir, 'metz-written', 'a.md'), 'body');
  writeFileSync(join(dir, 'metz-written', 'index.md'), '| A | `../a.md` |');

  assert.deepEqual(checkEntry(dir, 'metz-written')?.missing, ['../a.md']);
});

test('a cell with a leading dot folder or a trailing separator still indexes its file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oracle-store-check-'));
  mkdirSync(join(dir, 'metz-written'));
  writeFileSync(join(dir, 'metz-written', 'a.md'), 'body');
  writeFileSync(join(dir, 'metz-written', 'b.md'), 'body');
  writeFileSync(join(dir, 'metz-written', 'index.md'), '| A | `./a.md` |\n| B | `b.md/` |');

  assert.deepEqual(checkEntry(dir, 'metz-written')?.unindexed, []);
});

test('the companion code entry names its problems like a collection', () => {
  const report = { entry: '99bottles-js', indexed: 1, missing: ['gone.md'], empty: [], unindexed: [] };

  assert.deepEqual(describe(report), ['[ERROR] 99bottles-js: 1 indexed, 1 missing, 0 empty, 0 unindexed', '  missing: gone.md']);
});

test('an entry is OK only with no problem of any kind', () => {
  const report = (entry: string, missing: readonly string[], empty: readonly string[]) => ({ entry, indexed: 2, missing, empty, unindexed: [] });

  assert.deepEqual(describe(report('book', ['a.md'], ['b.md'])), ['[ERROR] book: 2 indexed, 1 missing, 1 empty, 0 unindexed']);
  assert.deepEqual(describe({ entry: 'book', indexed: 1, missing: ['a.md'], empty: [], unindexed: ['b.md'] }), [
    '[ERROR] book: 1 indexed, 1 missing, 0 empty, 1 unindexed',
  ]);
  assert.deepEqual(describe(report('book', [], [])), ['[OK] book: 2 indexed, 0 missing, 0 empty, 0 unindexed']);
  assert.deepEqual(describe(report('metz-written', [], [])), ['[OK] metz-written: 2 indexed, 0 missing, 0 empty, 0 unindexed']);
});

test('the command prints each report line, and names the missing store', (t) => {
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));
  const clean = mkdtempSync(join(tmpdir(), 'oracle-store-check-'));
  mkdirSync(join(clean, 'book'));
  writeFileSync(join(clean, 'book', 'a.md'), 'text');
  writeFileSync(join(clean, 'book', 'index.md'), '| `a.md` |');

  main(clean);
  main(join(clean, 'nowhere'));

  assert.deepEqual(printed, ['[OK] book: 1 indexed, 0 missing, 0 empty, 0 unindexed', '[ERROR] no store at .oracle/']);
});

test('the command fails on a missing file beside an unindexed one, and on a missing file beside an empty one', (t) => {
  t.mock.method(console, 'log', () => undefined);
  const entry = (index: string, files: Readonly<Record<string, string>>): string => {
    const dir = mkdtempSync(join(tmpdir(), 'oracle-store-check-'));
    mkdirSync(join(dir, 'book'));
    writeFileSync(join(dir, 'book', 'index.md'), index);
    Object.entries(files).forEach(([name, text]) => {
      writeFileSync(join(dir, 'book', name), text);
    });

    return dir;
  };

  assert.equal(main(entry('| `gone.md` |', { 'stray.md': 'text' })), 1);
  assert.equal(main(entry('| `gone.md` |\n| `empty.md` |', { 'empty.md': '' })), 1);
});

test('run as a command, it prints a report', () => {
  const run = spawnSync(process.execPath, [join(import.meta.dirname, 'store-check.ts')], { encoding: 'utf8' });

  assert.notEqual(`${run.stdout}${run.stderr}`, '');
});

test('the command exits 0 when consistent, 1 on a problem and 2 with no store', (t) => {
  const printed: string[] = [];
  t.mock.method(console, 'log', (line: string) => printed.push(line));
  t.mock.method(console, 'error', (line: string) => printed.push(line));
  const clean = mkdtempSync(join(tmpdir(), 'oracle-store-check-'));
  mkdirSync(join(clean, 'book'));
  writeFileSync(join(clean, 'book', 'a.md'), 'text');
  writeFileSync(join(clean, 'book', 'index.md'), '| `a.md` |');

  assert.equal(main(clean), 0);
  assert.equal(main(store()), 1);
  assert.equal(main(join(clean, 'nowhere')), 2);
  assert.ok(printed.every((line) => !line.includes('chapter-heading')), 'a book file name is never printed');
});
