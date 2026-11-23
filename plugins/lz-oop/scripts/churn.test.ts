import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { churn, commitsPerCurrentPath } from './churn.ts';
import { commitFiles, folderWith, git, repositoryWith } from './fixtures.ts';
import { type Git, gitIn } from './git.ts';

const hash = (digit: string): string => digit.repeat(40);

function gitOf(folder: string): Git {
  const runner = gitIn(folder);
  assert.ok(runner);

  return runner;
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

test('churn counts the commits of the period in a repository and leaves out older ones', (context) => {
  const root = repositoryWith(context, []);
  commitFiles(root, { 'a.ts': 'one' }, '2024-01-01T12:00:00Z');
  commitFiles(root, { 'a.ts': 'two' });
  commitFiles(root, { 'a.ts': 'three' });

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), { commits: new Map([['a.ts', 2]]), shallow: false });
});

test('churn says when the clone is shallow', (context) => {
  const origin = repositoryWith(context, [{ 'a.ts': 'one' }, { 'a.ts': 'two' }]);
  const clone = folderWith(context, {});
  git(clone, ['clone', '-q', '--depth', '1', pathToFileURL(origin).href, '.']);

  assert.deepEqual(churn(gitOf(clone), '2025-11-23'), { commits: new Map([['a.ts', 1]]), shallow: true });
});

test('a repository without commits has nothing to count', (context) => {
  const root = repositoryWith(context, []);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), { commits: new Map(), shallow: false });
});
