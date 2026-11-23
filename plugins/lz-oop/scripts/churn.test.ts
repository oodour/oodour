import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { churn, commitsPerCurrentPath } from './churn.ts';

const hash = (digit: string): string => digit.repeat(40);

function git(root: string, args: readonly string[], date = '2026-11-01T12:00:00Z'): string {
  return execFileSync('git', ['-c', 'user.name=lz-oop', '-c', 'user.email=lz-oop', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
}

function commit(root: string, file: string, text: string, date?: string): void {
  writeFileSync(join(root, file), text);
  git(root, ['add', file], date);
  git(root, ['commit', '-q', '-m', `change ${file}`], date);
}

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), 'lz-oop-churn-'));
  git(root, ['init', '-q']);

  return root;
}

test('a file one commit changed counts one commit', () => {
  const log = [hash('a'), '', 'M\tsrc/a.ts', ''].join('\n');

  assert.deepEqual(commitsPerCurrentPath(log), new Map([['src/a.ts', 1]]));
});

test('each commit that changes a file adds one to its count', () => {
  const log = [hash('b'), '', 'M\tsrc/a.ts', 'A\tsrc/b.ts', '', hash('a'), '', 'A\tsrc/a.ts', ''].join('\n');

  assert.deepEqual(
    commitsPerCurrentPath(log),
    new Map([
      ['src/a.ts', 2],
      ['src/b.ts', 1],
    ]),
  );
});

test('the commits before a rename count for the path the file has now', () => {
  const log = [
    hash('c'),
    '',
    'R100\tsrc/b.ts\tsrc/c.ts',
    '',
    hash('b'),
    '',
    'R087\tsrc/a.ts\tsrc/b.ts',
    '',
    hash('a'),
    '',
    'A\tsrc/a.ts',
    '',
  ].join('\n');

  assert.deepEqual(commitsPerCurrentPath(log), new Map([['src/c.ts', 3]]));
});

test('churn counts the commits of the period in a repository and leaves out older ones', () => {
  const root = repository();
  commit(root, 'a.ts', 'one', '2024-01-01T12:00:00Z');
  commit(root, 'a.ts', 'two');
  commit(root, 'a.ts', 'three');

  assert.deepEqual(churn(root, '2025-11-23'), { commits: new Map([['a.ts', 2]]), shallow: false });
});

test('churn says when the clone is shallow', () => {
  const origin = repository();
  commit(origin, 'a.ts', 'one');
  commit(origin, 'a.ts', 'two');
  const clone = mkdtempSync(join(tmpdir(), 'lz-oop-shallow-'));
  git(clone, ['clone', '-q', '--depth', '1', pathToFileURL(origin).href, '.']);

  assert.deepEqual(churn(clone, '2025-11-23'), { commits: new Map([['a.ts', 1]]), shallow: true });
});

test('churn has nothing to count in a folder outside any repository', (context) => {
  const folder = mkdtempSync(join(tmpdir(), 'lz-oop-no-git-'));
  process.env['GIT_CEILING_DIRECTORIES'] = tmpdir();
  context.after(() => {
    delete process.env['GIT_CEILING_DIRECTORIES'];
  });

  assert.equal(churn(folder, '2025-11-23'), undefined);
});
