import assert from 'node:assert/strict';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { folderWith, outsideAnyRepository, refusedByGit, repositoryWith, setForTest } from './fixtures.ts';
import { gitIn } from './git.ts';

test('in a repository, Git runs in the folder it was asked about', (context) => {
  const root = repositoryWith(context, [{ 'lib/a.ts': '' }]);

  assert.equal(gitIn(`${root}/lib`)?.(['rev-parse', '--show-prefix']), 'lib/\n');
});

test('a git program in the folder is not the Git that runs', { skip: process.platform !== 'win32' }, (context) => {
  const root = repositoryWith(context, [{ 'lib/a.ts': '' }]);
  copyFileSync(join(process.env['SystemRoot'] ?? 'C:/Windows', 'System32', 'hostname.exe'), join(root, 'lib', 'git.exe'));
  setForTest(context, 'NoDefaultCurrentDirectoryInExePath', undefined);

  assert.equal(gitIn(`${root}/lib`)?.(['rev-parse', '--show-prefix']), 'lib/\n');
});

test('a folder outside any repository has no Git', (context) => {
  const folder = folderWith(context, {});
  outsideAnyRepository(context);

  assert.equal(gitIn(folder), undefined);
});

test('without git installed there is no Git', (context) => {
  const root = repositoryWith(context, []);
  setForTest(context, 'PATH', '');

  assert.equal(gitIn(root), undefined);
});

test('a repository Git refuses to open fails with what Git said', (context) => {
  const root = repositoryWith(context, []);
  refusedByGit(context);

  assert.throws(() => gitIn(root), /^Error: git: .*dubious ownership/s);
});
