import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { chapterCitations, main } from './chapter-citations.ts';

function files(contents: Record<string, string>): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'chapter-citations-'));

  return Object.entries(contents).map(([name, text]) => {
    const path = join(dir, name);
    writeFileSync(path, text);

    return path;
  });
}

test('a chapter number is reported with its line and column', () => {
  assert.deepEqual(chapterCitations('Shameless Green.\nStart plain (Ch.1 and Ch.2).'), [
    { line: 2, column: 14, citation: 'Ch.1' },
    { line: 2, column: 23, citation: 'Ch.2' },
  ]);
});

test('a chapter number of two digits is reported whole', () => {
  assert.deepEqual(chapterCitations('See Ch.12.'), [{ line: 1, column: 5, citation: 'Ch.12' }]);
});

test('run as a script, it checks the files named on the command line and sets the exit code', () => {
  const [cited] = files({ 'cited.md': 'Two (Ch.3).' });
  assert.ok(cited);
  const run = spawnSync(process.execPath, [join(import.meta.dirname, 'chapter-citations.ts'), cited], {
    encoding: 'utf8',
  });

  assert.equal(run.status, 1);
  assert.equal(run.stdout, `${cited}:1:6: Ch.3\n[ERROR] 1 chapter citation(s); name the practice instead\n`);
});

test('a chapter number written out is reported too, and a chapter without a number is not', () => {
  assert.deepEqual(chapterCitations('As chapter 8 shows; Chapter 10 too; each chapter teaches one thing.'), [
    { line: 1, column: 4, citation: 'chapter 8' },
    { line: 1, column: 21, citation: 'Chapter 10' },
  ]);
});

test('the command lists each citation by file, line and column, and fails', () => {
  const [clean, cited] = files({ 'clean.md': 'No numbers here.', 'cited.md': 'One.\nTwo (Ch.3).' });
  const lines: string[] = [];
  assert.ok(clean);
  assert.ok(cited);

  assert.equal(main([clean, cited], (line) => lines.push(line)), 1);
  assert.deepEqual(lines, [`${cited}:2:6: Ch.3`, '[ERROR] 1 chapter citation(s); name the practice instead']);
});

test('the command passes when no file cites a chapter', () => {
  const lines: string[] = [];

  assert.equal(main(files({ 'clean.md': 'Shameless Green, from 99 Bottles of OOP.' }), (line) => lines.push(line)), 0);
  assert.deepEqual(lines, ['[OK] no chapter citations']);
});
