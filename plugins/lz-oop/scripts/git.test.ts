import assert from 'node:assert/strict';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { folderWith, outsideAnyRepository, refusedByGit, repositoryWith, runGit, setForTest } from './fixtures.ts';
import { gitIn } from './git.ts';

test('in a repository, Git runs in the folder it was asked about', (context) => {
  const root = repositoryWith(context, [{ 'lib/a.ts': '' }]);

  assert.equal(gitIn(`${root}/lib`)?.prefix, 'lib/');
});

test('a folder whose name starts with two dots is in the repository', (context) => {
  const root = repositoryWith(context, [{ '..lib/a.ts': '' }]);

  assert.equal(gitIn(join(root, '..lib'))?.prefix, '..lib/');
});

test('Git reaches no remote, whatever the repository allows', (context) => {
  const origin = repositoryWith(context, [{ 'a.ts': '' }]);
  const clone = folderWith(context, {});
  runGit(clone, ['clone', '-q', pathToFileURL(origin).href, '.']);
  runGit(clone, ['config', 'protocol.file.allow', 'always']);

  assert.throws(() => gitIn(clone)?.git(['fetch', '-q']), /transport 'file' not allowed/);
});

test('a repository whose work tree is elsewhere than the folder is refused', (context) => {
  const elsewhere = folderWith(context, { 'b.ts': '' });
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  runGit(root, ['config', 'core.worktree', elsewhere]);

  assert.throws(() => gitIn(root), /^Error: git: the repository's work tree .+ does not hold /);
});

test('a git program in the folder is not the Git that runs', { skip: process.platform !== 'win32' }, (context) => {
  const root = repositoryWith(context, [{ 'lib/a.ts': '' }]);
  copyFileSync(join(process.env['SystemRoot'] ?? 'C:/Windows', 'System32', 'hostname.exe'), join(root, 'lib', 'git.exe'));
  setForTest(context, 'NoDefaultCurrentDirectoryInExePath', undefined);

  assert.equal(gitIn(`${root}/lib`)?.prefix, 'lib/');
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
