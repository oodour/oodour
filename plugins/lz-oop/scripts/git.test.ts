import assert from 'node:assert/strict';
import { appendFileSync, copyFileSync, mkdirSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';
import { folderWith, gitAtLeast, networkShare, outsideAnyRepository, refusedByGit, repositoryHolding, repositoryWith, runGit, setForTest, writeFiles } from './fixtures.ts';
import { gitIn } from './git.ts';
import { assertLocalMetadata, type ConfigReader } from './metadata.ts';

test('in a repository, Git runs in the folder it was asked about', (context) => {
  const root = repositoryWith(context, [{ 'lib/a.ts': '' }]);

  assert.equal(gitIn(`${root}/lib`)?.prefix, 'lib/');
});

test('in a submodule, Git runs in the submodule', (context) => {
  const library = repositoryWith(context, [{ 'b.ts': '' }]);
  const root = repositoryHolding(context, { 'a.ts': '' });
  runGit(root, ['-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', library, 'lib']);

  assert.equal(gitIn(join(root, 'lib'))?.prefix, '');
});

test('a folder whose name starts with two dots is in the repository', (context) => {
  const root = repositoryWith(context, [{ '..lib/a.ts': '' }]);

  assert.equal(gitIn(join(root, '..lib'))?.prefix, '..lib/');
});

test('Git reaches no remote, whatever the repository allows', (context) => {
  const origin = repositoryHolding(context, { 'a.ts': '' });
  const clone = folderWith(context, {});
  runGit(clone, ['clone', '-q', pathToFileURL(origin).href, '.']);
  runGit(clone, ['config', 'protocol.file.allow', 'always']);

  assert.throws(() => gitIn(clone)?.git(['fetch', '-q']), /transport 'file' not allowed/);
});

test('a repository whose work tree is elsewhere than the folder is refused', (context) => {
  const elsewhere = folderWith(context, { 'b.ts': '' });
  const root = repositoryHolding(context, { 'a.ts': '' });
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

const share = networkShare;

test("a repository whose config names a network path is refused before Git runs", (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  runGit(root, ['config', 'core.hooksPath', `${share}\\hooks`]);

  assert.throws(() => gitIn(root), /^Error: git: core\.hookspath in .+config names a network path \([\\/]{2}lz-oop-test\.invalid[\\/]share\\hooks\)$/);
});

test('a repository whose remote is a network path is accepted, since Git reaches no remote', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  runGit(root, ['remote', 'add', 'origin', `${share}\\repo.git`]);
  runGit(root, ['config', 'remote.origin.pushurl', `${share}\\repo.git`]);

  assert.equal(gitIn(root)?.prefix, '');
});

test('a config value that cannot name a file is no path Git could open', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  runGit(root, ['config', 'alias.long', `!echo ${'x'.repeat(300)}`]);
  runGit(root, ['config', 'core.excludesFile', 'a.ts/ignore']);

  assert.equal(gitIn(root)?.prefix, '');
});

test('a config value that names a network path after a prefix Git strips is refused before Git runs', (context) => {
  const shared = share.replaceAll('\\', '/');
  const values = [
    ['core.excludesFile', `:(optional)${shared}/ignore`],
    ['include.path', `%(prefix)/${shared}/included`],
    ['extensions.refStorage', `files://${shared}/refs`],
  ];

  for (const [key = '', value = ''] of values) {
    const root = repositoryHolding(context, { 'a.ts': '' });
    runGit(root, ['config', key, value]);

    assert.throws(() => gitIn(root), /^Error: git: .+ in .+config names a network path/, value);
  }
});

test('a config value that leads to a network path through a link is refused before Git runs', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  symlinkSync(share, join(root, 'shared'), 'dir');
  runGit(root, ['config', 'core.excludesFile', 'shared/ignore']);

  assert.throws(() => gitIn(root), /^Error: git: core\.excludesfile in .+config leads to a network path \(shared\/ignore\)$/);
});

test('a config file an include names is checked like the config itself', (context) => {
  const elsewhere = folderWith(context, { included: `[mailmap]\n\tfile = ${share.replaceAll('\\', '/')}/mailmap\n` });
  const root = repositoryHolding(context, { 'a.ts': '' });
  runGit(root, ['config', 'include.path', join(elsewhere, 'included')]);

  assert.throws(() => gitIn(root), /^Error: git: mailmap\.file in .+included names a network path/);
});

test('an include whose name is not UTF-8 is read as Git reads it', { skip: process.platform !== 'win32' }, (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  appendFileSync(join(root, '.git', 'config'), Buffer.from('[include]\n\tpath = \xE9vil\n', 'latin1'));
  writeFiles(join(root, '.git'), { 'évil': `[core]\n\thooksPath = ${share.replaceAll('\\', '/')}\n` });

  assert.throws(() => gitIn(root), /^Error: git: core\.hookspath in .+évil names a network path/);
});

test('a relative include in a config file that is a link is read from where Git reads it', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  const gitFolder = join(root, '.git');
  mkdirSync(join(gitFolder, 'sub'));
  renameSync(join(gitFolder, 'config'), join(gitFolder, 'sub', 'config'));
  symlinkSync(join(gitFolder, 'sub', 'config'), join(gitFolder, 'config'), 'file');
  runGit(root, ['config', '--file', join(gitFolder, 'sub', 'config'), 'include.path', 'included']);
  writeFiles(gitFolder, { included: `[core]\n\thooksPath = ${share.replaceAll('\\', '/')}\n` });

  assert.throws(() => gitIn(root), /^Error: git: core\.hookspath in .+included names a network path/);
});

test('a relative include in a git folder reached through a .git link is read from the .git path too', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  const moved = join(root, 'sub', 'deep', 'gd');
  mkdirSync(join(root, 'sub', 'deep'), { recursive: true });
  renameSync(join(root, '.git'), moved);
  symlinkSync(moved, join(root, '.git'), 'dir');
  runGit(root, ['config', 'include.path', '../included']);
  writeFiles(root, { included: `[core]\n\thooksPath = ${share.replaceAll('\\', '/')}\n` });

  assert.throws(() => gitIn(root), /^Error: git: core\.hookspath in .+included names a network path/);
});

test('an include that steps back after a link is read with the step taken by its text too', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  const gitFolder = join(root, '.git');
  const deep = join(folderWith(context, {}), 'deep');
  mkdirSync(deep);
  symlinkSync(deep, join(gitFolder, 'linked'), 'dir');
  runGit(root, ['config', 'include.path', 'linked/../included']);
  writeFiles(gitFolder, { included: `[core]\n\thooksPath = ${share.replaceAll('\\', '/')}\n` });

  assert.throws(() => gitIn(root), /^Error: git: core\.hookspath in .+included names a network path/);
});

test('an include named from its drive is read from the folder Git runs in', { skip: process.platform !== 'win32' }, (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  writeFiles(root, { 'sub/cfg': `[core]\n\thooksPath = ${share.replaceAll('\\', '/')}\n` });
  runGit(root, ['config', 'include.path', `${root.slice(0, 2)}sub/cfg`]);

  assert.throws(() => gitIn(root), /^Error: git: core\.hookspath in .+cfg names a network path/);
});

test('an include named from the drive root is read on the drive Git runs on', { skip: process.platform !== 'win32' }, (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  writeFiles(root, { 'sub/cfg': `[core]\n\thooksPath = ${share.replaceAll('\\', '/')}\n` });
  runGit(root, ['config', 'include.path', `${root.slice(2)}\\sub\\cfg`]);

  assert.throws(() => gitIn(root), /^Error: git: core\.hookspath in .+cfg names a network path/);
});

test('a .git file that names its folder from its drive is read from the folder Git runs in', { skip: process.platform !== 'win32' }, (context) => {
  const root = folderWith(context, { '.git': '', 'sub/a.ts': '' });
  writeFiles(root, { '.git': `gitdir: ${root.slice(0, 2)}gd\n` });
  symlinkSync(share, join(root, 'sub', 'gd'), 'dir');

  assert.throws(() => gitIn(join(root, 'sub')), /^Error: git: .+\.git points to a path that leads to a network path \(.:gd\)$/);
});

test('a .git file that names its folder by a relative name is read from its own folder only', (context) => {
  const root = folderWith(context, { '.git': 'gitdir: gd\n', 'sub/a.ts': '' });
  symlinkSync(share, join(root, 'sub', 'gd'), 'dir');

  assert.doesNotThrow(() => {
    assertLocalMetadata(join(root, 'sub'), () => '');
  });
});

test('a config value named from another drive is not read from the folder Git runs in', { skip: process.platform !== 'win32' }, (context) => {
  const root = folderWith(context, { '.git/config': '' });
  const otherDrive = /^q/i.test(root) ? 'R:' : 'Q:';
  symlinkSync(share, join(root, 'sub'), 'dir');

  assert.doesNotThrow(() => {
    assertLocalMetadata(root, () => `core.hookspath\n${otherDrive}sub`);
  });
});

test('a config value with a colon past its first folder is read from the folder, not from a drive', (context) => {
  const root = folderWith(context, { '.git/config': '' });
  symlinkSync(share, join(root, 'shared'), 'dir');

  assert.throws(
    () => {
      assertLocalMetadata(root, () => 'core.excludesfile\nshared/a:b');
    },
    /^Error: git: core\.excludesfile in .+config leads to a network path \(shared\/a:b\)$/,
  );
});

test('a folder that is a network path is refused before anything in it is read', () => {
  assert.throws(() => {
    assertLocalMetadata(share, () => '');
  }, /^Error: git: [\\/]{2}lz-oop-test\.invalid[\\/]share is a network or device path, or leads to one$/);
});

// Each config file includes the next, from c1 to c11, by the name `nameOf` gives it.
const includeChain =
  (nameOf: (file: number) => string): ConfigReader =>
  (file) =>
    `include.path\n${nameOf(Number(/c(\d+)$/.exec(file)?.[1] ?? '0') + 1)}`;
const chainFiles = Object.fromEntries(
  ['config', ...Array.from({ length: 11 }, (_, index) => `c${String(index + 1)}`)].map((name) => [`.git/${name}`, '']),
);

test('an include more than 10 deep is refused', (context) => {
  const root = folderWith(context, chainFiles);

  assert.throws(() => {
    assertLocalMetadata(root, includeChain((file) => `c${String(file)}`));
  }, /[\\/]c11 is included more than 10 deep$/);
});

test('an include named from the drive root is refused by the path Git reads', { skip: process.platform !== 'win32' }, (context) => {
  const root = folderWith(context, chainFiles);
  const gitFolder = join(root, '.git');

  assert.throws(() => {
    assertLocalMetadata(root, includeChain((file) => join(gitFolder, `c${String(file)}`).slice(2)));
  }, {
    message: `git: ${join(gitFolder, 'c11')} is included more than 10 deep`,
  });
});

test('a .git file that points to a network path is refused before Git runs', (context) => {
  const root = folderWith(context, { '.git': `gitdir: ${share.replaceAll('\\', '/')}/repo.git\n`, 'a.ts': '' });

  assert.throws(() => gitIn(root), /^Error: git: .+\.git points to a network path \(\/\/lz-oop-test\.invalid\/share\/repo\.git\)$/);
});

test('a .git link to a .git file is read like the file', (context) => {
  const elsewhere = folderWith(context, { gitfile: `gitdir: ${share.replaceAll('\\', '/')}/repo.git\n` });
  const root = folderWith(context, { 'a.ts': '' });
  symlinkSync(join(elsewhere, 'gitfile'), join(root, '.git'), 'file');

  assert.throws(() => gitIn(root), /^Error: git: .+gitfile points to a network path \(\/\/lz-oop-test\.invalid\/share\/repo\.git\)$/);
});

test('a .git file is read as Git reads it, keeping the spaces after `gitdir: `', (context) => {
  const root = folderWith(context, { '.git': 'gitdir:  linked\n', 'a.ts': '' });
  symlinkSync(share, join(root, ' linked'), 'dir');

  assert.throws(() => gitIn(root), /^Error: git: .+\.git points to a path that leads to a network path \( linked\)$/);
});

test("a work tree whose repository's common folder is a network path is refused before Git runs", (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  const tree = join(folderWith(context, {}), 'tree');
  runGit(root, ['worktree', 'add', '-q', tree]);
  writeFiles(join(root, '.git', 'worktrees', 'tree'), { commondir: `${share}\\repo.git\n` });

  assert.throws(() => gitIn(tree), /^Error: git: .+commondir points to a network path/);
});

test('a commondir that steps back after a link is read with the step taken by its text too', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  const tree = join(folderWith(context, {}), 'tree');
  const treeGit = join(root, '.git', 'worktrees', 'tree');
  const deep = join(folderWith(context, {}), 'deep');
  runGit(root, ['worktree', 'add', '-q', tree]);
  mkdirSync(deep);
  symlinkSync(deep, join(treeGit, 'linked'), 'dir');
  writeFiles(treeGit, {
    commondir: 'linked/../common\n',
    'common/config': `[core]\n\thooksPath = ${share.replaceAll('\\', '/')}\n`,
  });

  assert.throws(() => gitIn(tree), /^Error: git: core\.hookspath in .+config names a network path/);
});

test('a commondir file that is a link is read like any other', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  const tree = join(folderWith(context, {}), 'tree');
  const elsewhere = folderWith(context, { commondir: `${share}\\repo.git\n` });
  runGit(root, ['worktree', 'add', '-q', tree]);
  rmSync(join(root, '.git', 'worktrees', 'tree', 'commondir'));
  symlinkSync(join(elsewhere, 'commondir'), join(root, '.git', 'worktrees', 'tree', 'commondir'), 'file');

  assert.throws(() => gitIn(tree), /^Error: git: .+commondir points to a network path/);
});

test('a commondir file that is a link to a network path is refused, naming the file', (context) => {
  const root = folderWith(context, { '.git/config': '' });
  symlinkSync(`${share}\\commondir`, join(root, '.git', 'commondir'), 'file');

  assert.throws(() => {
    assertLocalMetadata(root, () => '');
  }, {
    message: `git: ${join(root, '.git', 'commondir')} leads to a network path`,
  });
});

test('a link in the git folder that leads to a network path is refused before Git runs', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  rmSync(join(root, '.git', 'info'), { recursive: true, force: true });
  symlinkSync(share, join(root, '.git', 'info'), 'dir');

  assert.throws(() => gitIn(root), /^Error: git: .+info leads to a network path$/);
});

test('a link in a folder that a link in the git folder leads to is checked too', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  const elsewhere = folderWith(context, {});
  symlinkSync(share, join(elsewhere, 'heads'), 'dir');
  rmSync(join(root, '.git', 'info'), { recursive: true, force: true });
  symlinkSync(elsewhere, join(root, '.git', 'info'), 'dir');

  assert.throws(() => gitIn(root), /^Error: git: .+heads leads to a network path$/);
});

test("from a linked work tree, the repository's own config is checked", (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
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

test('a bare repository whose HEAD is a link is checked like any other', (context) => {
  const bare = folderWith(context, {});
  runGit(bare, ['init', '-q', '--bare']);
  runGit(bare, ['config', 'core.hooksPath', share]);
  rmSync(join(bare, 'HEAD'));
  symlinkSync('refs/heads/main', join(bare, 'HEAD'), 'file');

  assert.throws(() => gitIn(bare), /^Error: git: core\.hookspath in .+config names a network path/);
});

test('an empty .git folder in a bare repository does not hide its config', (context) => {
  const bare = folderWith(context, {});
  runGit(bare, ['init', '-q', '--bare']);
  runGit(bare, ['config', 'core.hooksPath', share]);
  mkdirSync(join(bare, '.git'));

  assert.throws(() => gitIn(bare), /^Error: git: core\.hookspath in .+config names a network path/);
});

test('an empty .git folder does not hide the config of the repository above it', (context) => {
  const root = repositoryWith(context, [{ 'sub/a.ts': '' }]);
  mkdirSync(join(root, 'sub', '.git'));
  runGit(root, ['config', 'core.hooksPath', share]);

  assert.throws(() => gitIn(join(root, 'sub')), /^Error: git: core\.hookspath in .+config names a network path/);
});

test('a repository inside one that borrows objects from a local repository is accepted', (context) => {
  const lender = repositoryHolding(context, { 'a.ts': '' });
  const outer = folderWith(context, {});
  const inner = join(outer, 'inner');
  runGit(outer, ['clone', '-q', '--shared', lender, '.']);
  mkdirSync(inner);
  runGit(inner, ['init', '-q']);

  assert.equal(gitIn(inner)?.prefix, '');
});

test('a link to a network path in the objects a repository borrows is refused', (context) => {
  const lender = repositoryHolding(context, { 'a.ts': '' });
  const root = folderWith(context, {});
  runGit(root, ['clone', '-q', '--shared', lender, '.']);
  rmSync(join(lender, '.git', 'objects', 'info'), { recursive: true, force: true });
  symlinkSync(share, join(lender, '.git', 'objects', 'info'), 'dir');

  assert.throws(() => gitIn(root), /^Error: git: .+info leads to a network path$/);
});

test('a repository that borrows objects from a network path is refused', (context) => {
  const root = repositoryHolding(context, { 'a.ts': '' });
  writeFiles(join(root, '.git', 'objects', 'info'), { alternates: `${share.replaceAll('\\', '/')}/objects\n` });

  assert.throws(() => gitIn(root), /^Error: git: .+alternates names a network path \(\/\/lz-oop-test\.invalid\/share\/objects\)$/);
});

// Git makes a reftable repository from 2.45 on.
test('a reftable table that leads to a network path through a link is refused', { skip: !gitAtLeast(2, 45) }, (context) => {
  const root = folderWith(context, {});
  runGit(root, ['init', '-q', '--ref-format=reftable']);
  symlinkSync(share, join(root, 'shared'), 'dir');
  writeFiles(join(root, '.git', 'reftable'), { 'tables.list': '../../shared/table.ref\n' });

  assert.throws(() => gitIn(root), /^Error: git: .+tables\.list names a path that leads to a network path \(\.\.\/\.\.\/shared\/table\.ref\)$/);
});

// A repository whose objects borrow from a chain of `length` object stores, each naming the next in its alternates.
function borrowingChain(context: TestContext, length: number): { readonly root: string; readonly lent: readonly string[] } {
  const base = folderWith(context, {});
  const lent = Array.from({ length }, (_, index) => join(base, `lent${String(index + 1)}`));
  const stores = [join(base, 'repo', '.git', 'objects'), ...lent];

  for (const [index, store] of stores.entries()) {
    writeFiles(store, { 'info/alternates': `${stores[index + 1] ?? ''}\n` });
  }

  return { root: join(base, 'repo'), lent };
}

test('a link to a network path in the sixth object store of a borrowing chain is refused, since Git reads that store', (context) => {
  const { root, lent } = borrowingChain(context, 6);
  const link = join(lent[5] ?? '', 'pack');
  symlinkSync(share, link, 'dir');

  assert.throws(() => {
    assertLocalMetadata(root, () => '');
  }, { message: `git: ${link} leads to a network path` });
});

test('a link to a network path in the seventh object store of a borrowing chain is accepted, since Git stops before it', (context) => {
  const { root, lent } = borrowingChain(context, 7);
  symlinkSync(share, join(lent[6] ?? '', 'pack'), 'dir');

  assert.doesNotThrow(() => {
    assertLocalMetadata(root, () => '');
  });
});

test('an http-alternates file that names a network path is refused like an alternates file', (context) => {
  const root = folderWith(context, { '.git/objects/info/http-alternates': `${share}\\objects\n` });

  assert.throws(() => {
    assertLocalMetadata(root, () => '');
  }, {
    message: `git: ${join(root, '.git', 'objects', 'info', 'http-alternates')} names a network path (${share}\\objects)`,
  });
});

test('a link in the git folder that leads back to it is walked once', (context) => {
  const root = folderWith(context, { '.git/config': '' });
  symlinkSync(join(root, '.git'), join(root, '.git', 'again'), 'dir');

  assert.doesNotThrow(() => {
    assertLocalMetadata(root, () => '');
  });
});

test('a reftable table named by a network path is refused, naming the list and the line', (context) => {
  const root = folderWith(context, { '.git/reftable/tables.list': `${share}\\table.ref\n` });

  assert.throws(() => {
    assertLocalMetadata(root, () => '');
  }, {
    message: `git: ${join(root, '.git', 'reftable', 'tables.list')} names a network path (${share}\\table.ref)`,
  });
});

test('a list of tables that is a link to a network path is refused, naming the list', (context) => {
  const root = folderWith(context, { '.git/config': '' });
  mkdirSync(join(root, '.git', 'reftable'));
  symlinkSync(`${share}\\tables.list`, join(root, '.git', 'reftable', 'tables.list'), 'file');

  assert.throws(() => {
    assertLocalMetadata(root, () => '');
  }, {
    message: `git: ${join(root, '.git', 'reftable', 'tables.list')} leads to a network path`,
  });
});

test('a git program in the folder is not the Git that runs', { skip: process.platform !== 'win32' }, (context) => {
  const root = repositoryWith(context, [{ 'lib/a.ts': '' }]);
  copyFileSync(join(process.env['SystemRoot'] ?? 'C:/Windows', 'System32', 'hostname.exe'), join(root, 'lib', 'git.exe'));
  setForTest(context, 'NoDefaultCurrentDirectoryInExePath', undefined);

  assert.equal(gitIn(`${root}/lib`)?.prefix, 'lib/');
});

test('a .git file that points to a missing folder leaves the folder outside any repository', (context) => {
  const root = folderWith(context, { '.git': 'gitdir: gone/.git/worktrees/tree\n', 'a.ts': '' });
  outsideAnyRepository(context);

  assert.equal(gitIn(root), undefined);
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

test('a git that is not a program fails, rather than counting as no Git', (context) => {
  const root = repositoryWith(context, []);
  const notAProgram = folderWith(context, { [process.platform === 'win32' ? 'git.exe' : 'git']: 'not a program\n' });
  setForTest(context, 'PATH', notAProgram);

  assert.throws(() => gitIn(root), /^Error: spawnSync git /);
});

test('a repository Git refuses to open fails with what Git said, without its last newline', (context) => {
  const root = repositoryWith(context, []);
  refusedByGit(context);

  assert.throws(() => gitIn(root), /^Error: git: .*dubious ownership.*\S$/s);
});

test('Git output past a mebibyte is read whole', (context) => {
  const text = 'x'.repeat(1024 ** 2 + 1);
  const root = repositoryWith(context, [{ 'big.txt': text }]);

  assert.equal(gitIn(root)?.git(['cat-file', '-p', 'HEAD:big.txt']), text);
});
