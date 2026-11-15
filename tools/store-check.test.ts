import assert from 'node:assert/strict';
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
  assert.deepEqual(indexedPaths('see `x.md`\n| a | `b.md` | `c d` | `https://x` |\n| `repo/lib` |'), ['b.md', 'repo/lib']);
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
