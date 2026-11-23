import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { churn, commitsPerCurrentPath } from './churn.ts';
import { commitFiles, folderWith, partialCloneOf, repositoryWith, runGit, writeFiles } from './fixtures.ts';
import { type Git, gitIn } from './git.ts';

const hash = (digit: string): string => digit.repeat(40);

function gitOf(folder: string): Git {
  const repository = gitIn(folder);
  assert.ok(repository);

  return repository.git;
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

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), { commits: new Map([['a.ts', 2]]), limits: [] });
});

test('churn says when the clone is shallow', (context) => {
  const origin = repositoryWith(context, [{ 'a.ts': 'one' }, { 'a.ts': 'two' }]);
  const clone = folderWith(context, {});
  runGit(clone,['clone', '-q', '--depth', '1', pathToFileURL(origin).href, '.']);

  assert.deepEqual(churn(gitOf(clone), '2025-11-23'), { commits: new Map([['a.ts', 1]]), limits: ['shallow'] });
});

test('a partial clone is counted from what it holds, without fetching from its remote', (context) => {
  const origin = repositoryWith(context, [{ 'a.ts': 'one\ntwo\nthree\nfour\n' }]);
  rmSync(join(origin, 'a.ts'));
  commitFiles(origin, { 'b.ts': 'one\ntwo\nthree\nfour\nfive\n' });
  const clone = partialCloneOf(context, origin);

  assert.deepEqual(churn(gitOf(clone), '2025-11-23'), { commits: new Map([['a.ts', 2], ['b.ts', 1]]), limits: ['partial'] });
});

test('a partial clone is known by any spelling Git reads as true', (context) => {
  const origin = repositoryWith(context, [{ 'a.ts': 'one\ntwo\nthree\nfour\n' }]);
  rmSync(join(origin, 'a.ts'));
  commitFiles(origin, { 'b.ts': 'one\ntwo\nthree\nfour\nfive\n' });
  const clone = partialCloneOf(context, origin);
  runGit(clone, ['config', 'remote.origin.promisor', 'ON']);

  assert.deepEqual(churn(gitOf(clone), '2025-11-23'), { commits: new Map([['a.ts', 2], ['b.ts', 1]]), limits: ['partial'] });
});

for (const filter of ['tree:0', 'combine:blob:none+tree:0']) {
  test(`a treeless clone (${filter}) has no commit counts, since its older commits list no files`, (context) => {
    const clone = partialCloneOf(context, repositoryWith(context, [{ 'a.ts': 'one' }, { 'a.ts': 'two' }]), filter);

    assert.equal(churn(gitOf(clone), '2025-11-23'), 'treeless');
  });
}

test('a repository without commits has nothing to count', (context) => {
  const root = repositoryWith(context, []);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), { commits: new Map(), limits: [] });
});

test('a file named HEAD is counted like any other file', (context) => {
  const root = repositoryWith(context, [{ HEAD: 'one', 'a.ts': 'one' }]);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), { commits: new Map([['HEAD', 1], ['a.ts', 1]]), limits: [] });
});

test("counting the commits runs no signature program the repository's own config names", (context) => {
  const hook = folderWith(context, { 'gpg.sh': '#!/bin/sh\ntouch "$(dirname "$0")/ran"\n' });
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  const signature = ['gpgsig -----BEGIN PGP SIGNATURE-----', ' ', ' c2lnbmF0dXJl', ' -----END PGP SIGNATURE-----'];
  const signed = runGit(root, ['cat-file', 'commit', 'HEAD']).replace(/^committer .*$/m, (line) =>
    [line, ...signature].join('\n'),
  );
  writeFiles(hook, { commit: signed });
  runGit(root, ['update-ref', 'HEAD', runGit(root, ['hash-object', '-t', 'commit', '-w', join(hook, 'commit')]).trim()]);
  runGit(root, ['config', 'log.showSignature', 'true']);
  runGit(root, ['config', 'gpg.program', `${hook.replaceAll('\\', '/')}/gpg.sh`]);

  churn(gitOf(root), '2025-11-23');

  assert.equal(existsSync(join(hook, 'ran')), false);
});

test("counting the commits reads no order file the repository's own config names", (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  runGit(root, ['config', 'diff.orderFile', join(folderWith(context, {}), 'order')]);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), { commits: new Map([['a.ts', 1]]), limits: [] });
});

test('a branch without commits has nothing to count, whatever other branches hold', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  runGit(root, ['checkout', '-q', '--orphan', 'fresh']);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), { commits: new Map(), limits: [] });
});
