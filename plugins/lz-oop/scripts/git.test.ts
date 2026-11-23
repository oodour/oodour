import assert from 'node:assert/strict';
import { test } from 'node:test';
import { folderWith, outsideAnyRepository, repositoryWith } from './fixtures.ts';
import { gitIn } from './git.ts';

test('in a repository, Git runs in the folder it was asked about', (context) => {
  const root = repositoryWith(context, [{ 'lib/a.ts': '' }]);

  assert.equal(gitIn(`${root}/lib`)?.(['rev-parse', '--show-prefix']), 'lib/\n');
});

test('a folder outside any repository has no Git', (context) => {
  const folder = folderWith(context, {});
  outsideAnyRepository(context);

  assert.equal(gitIn(folder), undefined);
});

test('a repository Git refuses to open fails with what Git said', (context) => {
  const root = repositoryWith(context, []);
  process.env['GIT_TEST_ASSUME_DIFFERENT_OWNER'] = '1';
  context.after(() => {
    delete process.env['GIT_TEST_ASSUME_DIFFERENT_OWNER'];
  });

  assert.throws(() => gitIn(root), /^Error: git: .*dubious ownership/s);
});
