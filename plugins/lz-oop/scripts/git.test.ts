import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { folderWith, outsideAnyRepository, refusedByGit, repositoryWith, runGit, setForTest, writeFiles } from './fixtures.ts';
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

test('a repository whose work tree is a folder above it is refused', (context) => {
  const above = folderWith(context, { 'b.ts': '' });
  const root = join(above, 'inner');
  mkdirSync(root);
  runGit(root, ['init', '-q']);
  runGit(root, ['config', 'core.worktree', above]);

  assert.throws(() => gitIn(root), /^Error: git: the repository's work tree .+ has no \.git of its own/);
});

const share = '\\\\lz-oop-test.invalid\\share';

test("a repository whose config names a network path is refused before Git runs", (context) => {
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  runGit(root, ['config', 'core.hooksPath', `${share}\\hooks`]);

  assert.throws(() => gitIn(root), /^Error: git: core\.hookspath in .+config names a network path \(\\\\lz-oop-test\.invalid\\share\\hooks\)$/);
});

test('a config file an include names is checked like the config itself', (context) => {
  const elsewhere = folderWith(context, { included: `[mailmap]\n\tfile = ${share.replaceAll('\\', '/')}/mailmap\n` });
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  runGit(root, ['config', 'include.path', join(elsewhere, 'included')]);

  assert.throws(() => gitIn(root), /^Error: git: mailmap\.file in .+included names a network path/);
});

test('a .git file that points to a network path is refused before Git runs', (context) => {
  const root = folderWith(context, { '.git': `gitdir: ${share.replaceAll('\\', '/')}/repo.git\n`, 'a.ts': '' });

  assert.throws(() => gitIn(root), /^Error: git: .+\.git points to a network path \(\/\/lz-oop-test\.invalid\/share\/repo\.git\)$/);
});

test("a work tree whose repository's common folder is a network path is refused before Git runs", (context) => {
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  const tree = join(folderWith(context, {}), 'tree');
  runGit(root, ['worktree', 'add', '-q', tree]);
  writeFiles(join(root, '.git', 'worktrees', 'tree'), { commondir: `${share}\\repo.git\n` });

  assert.throws(() => gitIn(tree), /^Error: git: .+commondir points to a network path/);
});

test('a link in the git folder that leads to a network path is refused before Git runs', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  rmSync(join(root, '.git', 'info'), { recursive: true, force: true });
  symlinkSync(share, join(root, '.git', 'info'), 'dir');

  assert.throws(() => gitIn(root), /^Error: git: .+info leads to a network path$/);
});

test("from a linked work tree, the repository's own config is checked", (context) => {
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  const tree = join(folderWith(context, {}), 'tree');
  runGit(root, ['worktree', 'add', '-q', tree]);
  runGit(root, ['config', 'core.hooksPath', share]);

  assert.throws(() => gitIn(tree), /^Error: git: core\.hookspath in .+config names a network path/);
});

test("a bare repository's config is checked like any other", (context) => {
  const bare = folderWith(context, {});
  runGit(bare, ['init', '-q', '--bare']);
  runGit(bare, ['config', 'core.hooksPath', share]);

  assert.throws(() => gitIn(join(bare, 'refs')), /^Error: git: core\.hookspath in .+config names a network path/);
});

test('a repository that borrows objects from another is refused', (context) => {
  const lender = repositoryWith(context, [{ 'a.ts': '' }]);
  const root = folderWith(context, {});
  runGit(root, ['clone', '-q', '--shared', lender, '.']);

  assert.throws(() => gitIn(root), /^Error: git: the repository borrows objects from elsewhere \(.+alternates\)/);
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
