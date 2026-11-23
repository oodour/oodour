import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { folderWith, outsideAnyRepository, repositoryWith, runGit, setForTest, writeFiles } from './fixtures.ts';
import { filesBelow, isTest, sources } from './files.ts';
import { gitIn } from './git.ts';

test("a repository's JavaScript and TypeScript files are its sources, named from its top folder", (context) => {
  const root = folderWith(context, {
    'src/a.ts': '',
    'src/b.jsx': '',
    'src/types.d.ts': '',
    'README.md': '',
    'ignored/c.ts': '',
    '.gitignore': 'ignored/\n',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(sources(root, gitIn(root)), {
    root,
    all: ['src/a.ts', 'src/b.jsx'],
    inScope: ['src/a.ts', 'src/b.jsx'],
    skipped: [],
  });
});

test('a folder of a repository scopes the sources to the files below it', (context) => {
  const root = folderWith(context, { 'lib/a.ts': '', 'lib-two/b.ts': '', 'c.ts': '' });
  runGit(root, ['init', '-q']);
  const scope = join(root, 'lib');

  assert.deepEqual(sources(scope, gitIn(scope)).inScope, ['lib/a.ts']);
});

test('a file Git still lists but the working tree no longer has is no source', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': '', 'b.ts': '' }]);
  rmSync(join(root, 'b.ts'));

  assert.deepEqual(sources(root, gitIn(root)).all, ['a.ts']);
});

test("listing the sources runs no program the repository's own config names", (context) => {
  const hook = folderWith(context, { 'hook.sh': 'touch "$(dirname "$0")/ran"\n' });
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  runGit(root, ['config', 'core.fsmonitor', `sh "${hook.replaceAll('\\', '/')}/hook.sh"`]);

  sources(root, gitIn(root));

  assert.equal(existsSync(join(hook, 'ran')), false);
});

test("a file the user's own global exclude file ignores is no source", (context) => {
  const home = folderWith(context, { ignored: 'b.ts\n' });
  writeFiles(home, { gitconfig: `[core]\n\texcludesFile = ${join(home, 'ignored').replaceAll('\\', '/')}\n` });
  setForTest(context, 'GIT_CONFIG_GLOBAL', join(home, 'gitconfig'));
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  writeFiles(root, { 'b.ts': '' });

  assert.deepEqual(sources(root, gitIn(root)).all, ['a.ts']);
});

test('a linked file or folder is no source, so nothing outside the repository is read', (context) => {
  const outside = folderWith(context, { 'b.ts': '', 'lib/c.ts': '' });
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  symlinkSync(join(outside, 'b.ts'), join(root, 'b.ts'), 'file');
  symlinkSync(join(outside, 'lib'), join(root, 'lib'), 'junction');

  assert.deepEqual(sources(root, gitIn(root)).all, ['a.ts']);
});

test('outside a repository a linked file or folder is no source either', (context) => {
  const outside = folderWith(context, { 'b.ts': '', 'lib/c.ts': '' });
  const root = folderWith(context, { 'a.ts': '' });
  symlinkSync(join(outside, 'b.ts'), join(root, 'b.ts'), 'file');
  symlinkSync(join(outside, 'lib'), join(root, 'lib'), 'junction');
  outsideAnyRepository(context);

  assert.deepEqual(sources(root, undefined).all, ['a.ts']);
});

test('outside a repository a folder whose name ends in a dot holds no source and is reported', (context) => {
  const root = folderWith(context, { 'a.ts': '' });
  const exact = (path: string) => (process.platform === 'win32' ? `\\\\?\\${path}` : path);
  mkdirSync(exact(join(root, 'odd.')));
  writeFileSync(exact(join(root, 'odd.', 'x.ts')), '');
  outsideAnyRepository(context);

  assert.deepEqual(sources(root, undefined), { root, all: ['a.ts'], inScope: ['a.ts'], skipped: ['odd.'] });
});

test('a folder renamed only in case outside Git keeps its sources', { skip: process.platform === 'linux' }, (context) => {
  const root = repositoryWith(context, [{ 'src/a.ts': '' }]);
  renameSync(join(root, 'src'), join(root, 'Src'));

  assert.deepEqual(sources(root, gitIn(root)).all, ['src/a.ts']);
});

test('the walk enters no link, so no file behind one is listed', (context) => {
  const outside = folderWith(context, { 'x.ts': '' });
  const root = folderWith(context, { 'a.ts': '' });
  symlinkSync(outside, join(root, 'linked'), 'junction');

  assert.deepEqual(filesBelow(root).files, ['a.ts']);
});

test('the walk lists nothing in a .git or node_modules folder', (context) => {
  const root = folderWith(context, { 'a.ts': '', '.git/hooks/b.ts': '', 'node_modules/x/c.ts': '' });

  assert.deepEqual(filesBelow(root), { files: ['a.ts'], skipped: [] });
});

test('the walk reports the links it did not enter, so nothing reads through them', (context) => {
  const outside = folderWith(context, { 'x.ts': '', 'lib/y.ts': '' });
  const root = folderWith(context, { 'sub/a.ts': '' });
  symlinkSync(join(outside, 'x.ts'), join(root, 'b.ts'), 'file');
  symlinkSync(join(outside, 'lib'), join(root, 'sub', 'linked'), 'junction');

  assert.deepEqual(filesBelow(root), { files: ['sub/a.ts'], skipped: ['b.ts', 'sub/linked'] });
});

test('the walk reports a name ending in a dot or a space, which Windows may open as another name', (context) => {
  const root = folderWith(context, { 'odd/a.ts': '' });
  const exact = (path: string) => (process.platform === 'win32' ? `\\\\?\\${path}` : path);
  mkdirSync(exact(join(root, 'odd.')));
  writeFileSync(exact(join(root, 'odd.', 'x.ts')), '');
  writeFileSync(exact(join(root, 'b.ts ')), '');

  assert.deepEqual(filesBelow(root), { files: ['odd/a.ts'], skipped: ['b.ts ', 'odd.'] });
});

test('the walk reports a folder it may not list instead of failing', { skip: process.getuid?.() === 0 }, (context) => {
  const root = folderWith(context, { 'a.ts': '', 'locked/x.ts': '' });
  const locked = join(root, 'locked');
  const user = userInfo().username;
  const lock = (on: boolean) => {
    if (process.platform === 'win32') {
      spawnSync('icacls', [locked, ...(on ? ['/deny', `${user}:(RD)`] : ['/remove:d', user])]);
    } else {
      chmodSync(locked, on ? 0o000 : 0o755);
    }
  };
  lock(true);

  try {
    assert.deepEqual(filesBelow(root), { files: ['a.ts'], skipped: ['locked'] });
  } finally {
    lock(false);
  }
});

test('a test file is named .test or .spec, or sits in a __tests__ folder', () => {
  const files = ['src/a.test.ts', 'src/b.spec.jsx', 'src/__tests__/c.ts', 'src/d.ts', 'src/testing.ts', 'latest.ts'];

  assert.deepEqual(files.map(isTest), [true, true, true, false, false, false]);
});

test('outside a repository the sources are the files below the scope, without node_modules or folders', (context) => {
  const root = folderWith(context, { 'src/a.ts': '', 'node_modules/x/index.js': '', 'b.mjs': '', 'chart.js/README.md': '' });
  outsideAnyRepository(context);

  assert.deepEqual(sources(root, undefined), {
    root,
    all: ['b.mjs', 'src/a.ts'],
    inScope: ['b.mjs', 'src/a.ts'],
    skipped: [],
  });
});
