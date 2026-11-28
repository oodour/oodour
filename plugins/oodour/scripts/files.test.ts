import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs, {
  chmodSync,
  type Dirent,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { userInfo } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import {
  builtInMockForTest,
  folderWith,
  outsideAnyRepository,
  repositoryWith,
  runGit,
  setForTest,
  writeFiles,
} from './fixtures.ts';
import { filesBelow, isTest, sources } from './files.ts';
import { gitIn } from './git.ts';
import { ignoreFileIn, isIgnored } from './gitignore.ts';

const lockFor = (folder: string, on: boolean): void => {
  if (process.platform === 'win32') {
    const user = userInfo().username;
    spawnSync('icacls', [
      folder,
      ...(on ? ['/deny', `${user}:(RD)`] : ['/remove:d', user]),
    ]);
  } else {
    chmodSync(folder, on ? 0o000 : 0o755);
  }
};

// Root, and an administrator such as a hosted Windows runner's account, list a folder whatever its permissions say.
const readsPastLock = (folder: string): boolean => {
  try {
    readdirSync(folder);

    return true;
  } catch {
    return false;
  }
};

// Lists folders through `listing` for the test, which gets the folder and a way to list it as it is: for what no
// account or no system can set up on disk.
function listFoldersWith(
  context: TestContext,
  listing: (folder: string, asItIs: () => Dirent[]) => Dirent[],
): void {
  const original = fs.readdirSync;
  builtInMockForTest(context, () =>
    context.mock.method(
      fs,
      'readdirSync',
      (folder: string, options: { readonly withFileTypes: true }) =>
        listing(folder, () => original(folder, options)),
    ),
  );
}

const refusal = (code: string): Error =>
  Object.assign(new Error(`${code}: refused`), { code });

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
    ignored: undefined,
  });
});

test('a folder of a repository scopes the sources to the files below it', (context) => {
  const root = folderWith(context, {
    'lib/a.ts': '',
    'lib-two/b.ts': '',
    'c.ts': '',
  });
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
  const hook = folderWith(context, {
    'hook.sh': 'touch "$(dirname "$0")/ran"\n',
  });
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  runGit(root, [
    'config',
    'core.fsmonitor',
    `sh "${hook.replaceAll('\\', '/')}/hook.sh"`,
  ]);

  sources(root, gitIn(root));

  assert.equal(existsSync(join(hook, 'ran')), false);
});

test("a file the user's own global exclude file ignores is no source", (context) => {
  const home = folderWith(context, { ignored: 'b.ts\n' });
  writeFiles(home, {
    gitconfig: `[core]\n\texcludesFile = ${join(home, 'ignored').replaceAll('\\', '/')}\n`,
  });
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

test('in a repository not trusted, a file its .gitignore ignores is no source, as Git would leave it out', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'dist/\n',
    'dist/a.js': '',
    'src/b.ts': '',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(sources(root, undefined).all, ['src/b.ts']);
});

test("in a repository not trusted, a scope folder's own .gitignore applies to the files below it", (context) => {
  const root = folderWith(context, {
    'lib/.gitignore': 'out/\n',
    'lib/out/a.js': '',
    'lib/b.ts': '',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(sources(join(root, 'lib'), undefined).all, ['b.ts']);
});

test('in a repository not trusted, a file not named .gitignore is not read as one', (context) => {
  const root = folderWith(context, { 'a.ts': 'b.ts\n', 'b.ts': 'a.ts\n' });
  runGit(root, ['init', '-q']);

  assert.deepEqual(sources(root, undefined).all, ['a.ts', 'b.ts']);
});

test("in a repository not trusted, a deeper .gitignore's anchored rule applies only below its own folder", (context) => {
  const root = folderWith(context, {
    'lib/.gitignore': '/gen/\n',
    'gen/a.ts': '',
    'lib/gen/b.ts': '',
    'lib/c.ts': '',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(
    sources(root, undefined).all,
    sources(root, gitIn(root)).all,
  );
});

test('in a repository not trusted, the ignore files above the scope and in .git/info/exclude apply too', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'out/\n',
    'lib/out/a.js': '',
    'lib/gen/c.ts': '',
    'lib/b.ts': '',
  });
  runGit(root, ['init', '-q']);
  writeFiles(root, { '.git/info/exclude': 'gen/\n' });

  assert.deepEqual(sources(join(root, 'lib'), undefined).all, ['b.ts']);
});

test('in a repository not trusted, a scope inside an ignored folder holds no source, as Git re-includes nothing there', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'a/\n',
    'a/.gitignore': '!*.ts\n',
    'a/b/x.ts': '',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(sources(join(root, 'a', 'b'), undefined).all, []);
});

test('in a repository not trusted, the listing names the folders it left out as ignored, from the scope', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'dist/\n*.log\n',
    'lib/dist/a.js': '',
    'lib/b.ts': '',
    'lib/c.log': '',
    'lib/sub/.gitignore': 'gen/\n',
    'lib/sub/gen/x.ts': '',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(sources(join(root, 'lib'), undefined).ignored, [
    'dist',
    'sub/gen',
  ]);
});

test('in a repository not trusted, .git is never named an ignored folder, as Git never ignores it', (context) => {
  const root = folderWith(context, {
    '.gitignore': '.*\n!.gitignore\n',
    '.cache/x.ts': '',
    'a.ts': '',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(sources(root, undefined).ignored, ['.cache']);
});

test(
  'a node_modules folder named in another case is walked, as Git lists its files',
  { skip: process.platform === 'linux' },
  (context) => {
    const root = folderWith(context, { 'a.ts': '', 'NODE_MODULES/b.ts': '' });
    runGit(root, ['init', '-q']);

    assert.deepEqual(
      sources(root, undefined).all,
      sources(root, gitIn(root)).all,
    );
  },
);

test('a repository nested below the scope is reported, not walked, as Git lists it as one entry', (context) => {
  const root = folderWith(context, { 'a.ts': '', 'n/b.ts': '' });
  runGit(root, ['init', '-q']);
  runGit(join(root, 'n'), ['init', '-q']);

  const { all, skipped } = sources(root, undefined);

  assert.deepEqual({ all, skipped }, { all: ['a.ts'], skipped: ['n'] });
});

test(
  'a nested repository whose .git is named in another case is not walked where Git reads it so',
  { skip: process.platform === 'linux' },
  (context) => {
    const root = folderWith(context, { 'a.ts': '', 'n/b.ts': '' });
    runGit(root, ['init', '-q']);
    runGit(join(root, 'n'), ['init', '-q']);
    renameSync(join(root, 'n', '.git'), join(root, 'n', '.GIT'));

    assert.deepEqual(
      sources(root, undefined).all,
      sources(root, gitIn(root)).all,
    );
  },
);

test('in a repository not trusted, an ignore file named in another case is read where Git reads it', (context) => {
  const root = folderWith(context, {
    'sub/.GITIGNORE': 'out/\n',
    'sub/out/a.ts': '',
    'sub/b.ts': '',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(
    sources(root, undefined).all,
    sources(root, gitIn(root)).all,
  );
});

test('in a repository not trusted, the sources are the files Git itself would list', (context) => {
  const ignored = [
    '# a comment',
    '*.gen.ts',
    '!keep.gen.ts',
    '/top-only.ts',
    'build/',
    '!build/back.ts',
    '**/deep/*.js',
    'a/**/z.ts',
    'docs/**',
    'lib/*/skip.ts',
    'f?le.ts',
    '[ab]x.ts',
    '[!c]y.ts',
    '\\#hash.ts',
    'spaced.ts   ',
    'case.ts',
    'two**stars.ts',
    'sub2/out/',
  ];
  const root = folderWith(context, {
    '.gitignore': ignored.join('\n'),
    'sub/.gitignore': '!y.gen.ts\n',
    'sub2/.gitignore': '!out/\n',
    'sub2/out/x.ts': '',
    ...Object.fromEntries(
      [
        'x.gen.ts',
        'keep.gen.ts',
        'sub/y.gen.ts',
        'sub/z.gen.ts',
        'top-only.ts',
        'sub/top-only.ts',
        'build/a.ts',
        'build/back.ts',
        'sub/build/b.ts',
        'p/deep/c.js',
        'deep/d.js',
        'a/z.ts',
        'a/b/c/z.ts',
        'docs/e.ts',
        'lib/m/skip.ts',
        'lib/m/n/skip.ts',
        'file.ts',
        'fle.ts',
        'ax.ts',
        'cx.ts',
        'ay.ts',
        'cy.ts',
        '#hash.ts',
        'spaced.ts',
        'Case.ts',
        'twoxstars.ts',
        'normal.ts',
      ].map((file) => [file, '']),
    ),
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(
    sources(root, undefined).all,
    sources(root, gitIn(root)).all,
  );
});

test('outside a repository a folder whose name ends in a dot holds no source and is reported', (context) => {
  const root = folderWith(context, { 'a.ts': '' });
  const exact = (path: string) =>
    process.platform === 'win32' ? `\\\\?\\${path}` : path;
  mkdirSync(exact(join(root, 'odd.')));
  writeFileSync(exact(join(root, 'odd.', 'x.ts')), '');
  outsideAnyRepository(context);

  assert.deepEqual(sources(root, undefined), {
    root,
    all: ['a.ts'],
    inScope: ['a.ts'],
    skipped: ['odd.'],
    ignored: undefined,
  });
});

test(
  'a folder renamed only in case outside Git keeps its sources',
  { skip: process.platform === 'linux' },
  (context) => {
    const root = repositoryWith(context, [{ 'src/a.ts': '' }]);
    renameSync(join(root, 'src'), join(root, 'Src'));

    assert.deepEqual(sources(root, gitIn(root)).all, ['src/a.ts']);
  },
);

test('the walk enters no link, so no file behind one is listed', (context) => {
  const outside = folderWith(context, { 'x.ts': '' });
  const root = folderWith(context, { 'a.ts': '' });
  symlinkSync(outside, join(root, 'linked'), 'junction');

  assert.deepEqual(filesBelow(root).files, ['a.ts']);
});

test('the walk lists nothing in a .git or node_modules folder', (context) => {
  const root = folderWith(context, {
    'a.ts': '',
    '.git/hooks/b.ts': '',
    'node_modules/x/c.ts': '',
  });

  const { files, skipped } = filesBelow(root);

  assert.deepEqual({ files, skipped }, { files: ['a.ts'], skipped: [] });
});

test('the walk reports the links it did not enter, so nothing reads through them', (context) => {
  const outside = folderWith(context, { 'x.ts': '', 'lib/y.ts': '' });
  const root = folderWith(context, { 'sub/a.ts': '' });
  symlinkSync(join(outside, 'x.ts'), join(root, 'b.ts'), 'file');
  symlinkSync(join(outside, 'lib'), join(root, 'sub', 'linked'), 'junction');

  const { files, skipped } = filesBelow(root);

  assert.deepEqual(
    { files, skipped },
    { files: ['sub/a.ts'], skipped: ['b.ts', 'sub/linked'] },
  );
});

test('the walk reports a name ending in a dot or a space, which Windows may open as another name', (context) => {
  const root = folderWith(context, { 'odd/a.ts': '' });
  const exact = (path: string) =>
    process.platform === 'win32' ? `\\\\?\\${path}` : path;
  mkdirSync(exact(join(root, 'odd.')));
  writeFileSync(exact(join(root, 'odd.', 'x.ts')), '');
  writeFileSync(exact(join(root, 'b.ts ')), '');

  const { files, skipped } = filesBelow(root);

  assert.deepEqual(
    { files, skipped },
    { files: ['odd/a.ts'], skipped: ['b.ts ', 'odd.'] },
  );
});

test('the walk reports a folder it may not list instead of failing', (context) => {
  const root = folderWith(context, { 'a.ts': '', 'locked/x.ts': '' });
  const locked = join(root, 'locked');
  lockFor(locked, true);

  try {
    if (readsPastLock(locked)) {
      context.skip('this account lists a folder it is denied');

      return;
    }

    const { files, skipped } = filesBelow(root);

    assert.deepEqual(
      { files, skipped },
      { files: ['a.ts'], skipped: ['locked'] },
    );
  } finally {
    lockFor(locked, false);
  }
});

test('the walk fails on a scope it may not list, rather than report it empty', (context) => {
  const root = folderWith(context, { 'a.ts': '' });
  lockFor(root, true);

  try {
    if (readsPastLock(root)) {
      context.skip('this account lists a folder it is denied');

      return;
    }

    assert.throws(() => filesBelow(root), {
      code: process.platform === 'win32' ? 'EPERM' : 'EACCES',
    });
  } finally {
    lockFor(root, false);
  }
});

test(
  'the walk lists no FIFO or other file that is neither a plain file nor a folder',
  { skip: process.platform === 'win32' },
  (context) => {
    const root = folderWith(context, { 'a.ts': '' });
    spawnSync('mkfifo', [join(root, 'pipe.ts')]);

    assert.deepEqual(filesBelow(root).files, ['a.ts']);
  },
);

test('the walk reports a folder the system refuses to list, for either reason it gives, whatever the account may list', (context) => {
  const root = folderWith(context, {
    'a.ts': '',
    'denied/x.ts': '',
    'forbidden/y.ts': '',
  });
  const codes = new Map([
    [join(root, 'denied'), 'EPERM'],
    [join(root, 'forbidden'), 'EACCES'],
  ]);
  listFoldersWith(context, (folder, asItIs) => {
    const code = codes.get(folder);

    if (code !== undefined) {
      throw refusal(code);
    }

    return asItIs();
  });

  const { files, skipped } = filesBelow(root);

  assert.deepEqual(
    { files, skipped },
    { files: ['a.ts'], skipped: ['denied', 'forbidden'] },
  );
});

test('the walk fails on a folder the system cannot list for another reason than a refusal', (context) => {
  const root = folderWith(context, { 'a.ts': '', 'broken/x.ts': '' });
  listFoldersWith(context, (folder, asItIs) => {
    if (folder === join(root, 'broken')) {
      throw refusal('EIO');
    }

    return asItIs();
  });

  assert.throws(() => filesBelow(root), { code: 'EIO' });
});

test('the walk fails on a scope the system refuses to list, whatever the account may list', (context) => {
  const root = folderWith(context, { 'a.ts': '' });
  listFoldersWith(context, (folder, asItIs) => {
    if (folder === root) {
      throw refusal('EPERM');
    }

    return asItIs();
  });

  assert.throws(() => filesBelow(root), { code: 'EPERM' });
});

test('the walk lists no entry that is neither a plain file nor a folder, on any system', (context) => {
  const root = folderWith(context, { 'a.ts': '', 'pipe.ts': '' });
  listFoldersWith(context, (_, asItIs) =>
    asItIs().map((entry) =>
      entry.name === 'pipe.ts'
        ? Object.assign(entry, { isFile: () => false })
        : entry,
    ),
  );

  assert.deepEqual(filesBelow(root).files, ['a.ts']);
});

test('the walk reports what it skipped in order, wherever it found it', (context) => {
  const outside = folderWith(context, { 'lib/x.ts': '' });
  const root = folderWith(context, { 'a/b.ts': '' });
  symlinkSync(join(outside, 'lib'), join(root, 'z'), 'junction');
  symlinkSync(join(outside, 'lib'), join(root, 'a', 'y'), 'junction');

  assert.deepEqual(filesBelow(root).skipped, ['a/y', 'z']);
});

test('outside a repository a .gitignore leaves no file out, as no Git reads it', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'b.ts\n',
    'a.ts': '',
    'b.ts': '',
  });
  outsideAnyRepository(context);

  assert.deepEqual(sources(root, undefined).all, ['a.ts', 'b.ts']);
});

test('in a repository not trusted, a scope folder its parent .gitignore ignores holds no source', (context) => {
  const root = folderWith(context, { '.gitignore': 'b/\n', 'b/x.ts': '' });
  runGit(root, ['init', '-q']);
  const scope = join(root, 'b');

  assert.deepEqual(sources(scope, undefined), {
    root: scope,
    all: [],
    inScope: [],
    skipped: [],
    ignored: 'whole scope',
  });
});

test('in a repository not trusted, a .git/info/exclude that ignores everything but sources keeps them', (context) => {
  const root = folderWith(context, { 'a.ts': '' });
  runGit(root, ['init', '-q']);
  writeFiles(root, { '.git/info/exclude': '*\n!*.ts\n' });

  assert.deepEqual(
    { ours: sources(root, undefined).all, git: sources(root, gitIn(root)).all },
    { ours: ['a.ts'], git: ['a.ts'] },
  );
});

test('in a repository not trusted, the listing names the ignored folders in order, wherever it found them', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'zdist/\ngen/\n',
    'zdist/x.ts': '',
    'a/gen/y.ts': '',
    'a/b.ts': '',
  });
  runGit(root, ['init', '-q']);

  assert.deepEqual(sources(root, undefined).ignored, ['a/gen', 'zdist']);
});

test("an ignore file's rules apply only to paths below its own folder", () => {
  assert.equal(
    isIgnored([ignoreFileIn('lib', 'x.ts\n')], 'other/x.ts', false),
    false,
  );
});

test('a test file is named .test or .spec, or sits in a __tests__ folder', () => {
  const files = [
    'src/a.test.ts',
    'src/b.spec.jsx',
    'src/__tests__/c.ts',
    'src/f.test.mjs',
    '__tests__/g.ts',
    'src/d.ts',
    'src/testing.ts',
    'latest.ts',
    'src/e.test.json',
  ];

  assert.deepEqual(files.map(isTest), [
    true,
    true,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
  ]);
});

test('outside a repository the sources are the files below the scope, without node_modules or folders', (context) => {
  const root = folderWith(context, {
    'src/a.ts': '',
    'node_modules/x/index.js': '',
    'b.mjs': '',
    'chart.js/README.md': '',
  });
  outsideAnyRepository(context);

  assert.deepEqual(sources(root, undefined), {
    root,
    all: ['b.mjs', 'src/a.ts'],
    inScope: ['b.mjs', 'src/a.ts'],
    skipped: [],
    ignored: undefined,
  });
});
