import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { churn, commitsPerCurrentPath } from './churn.ts';
import {
  commitFiles,
  folderWith,
  gitAtLeast,
  partialCloneOf,
  repositoryWith,
  runGit,
  setForTest,
  writeFiles,
} from './fixtures.ts';
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
  const log = [
    hash('b'),
    '',
    'M\tsrc/a.ts',
    'A\tsrc/b.ts',
    '',
    hash('a'),
    '',
    'A\tsrc/a.ts',
    '',
  ].join('\n');

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

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), {
    commits: new Map([['a.ts', 2]]),
    limits: [],
  });
});

test('churn says when the clone is shallow', (context) => {
  const origin = repositoryWith(context, [
    { 'a.ts': 'one' },
    { 'a.ts': 'two' },
  ]);
  const clone = folderWith(context, {});
  runGit(clone, [
    'clone',
    '-q',
    '--depth',
    '1',
    pathToFileURL(origin).href,
    '.',
  ]);

  assert.deepEqual(churn(gitOf(clone), '2025-11-23'), {
    commits: new Map([['a.ts', 1]]),
    limits: ['shallow'],
  });
});

test('a partial clone is counted from what it holds, without fetching from its remote', (context) => {
  const origin = repositoryWith(context, [
    { 'a.ts': 'one\ntwo\nthree\nfour\n' },
  ]);
  rmSync(join(origin, 'a.ts'));
  commitFiles(origin, { 'b.ts': 'one\ntwo\nthree\nfour\nfive\n' });
  const clone = partialCloneOf(context, origin);

  assert.deepEqual(churn(gitOf(clone), '2025-11-23'), {
    commits: new Map([
      ['a.ts', 2],
      ['b.ts', 1],
    ]),
    limits: ['partial'],
  });
});

test('a partial clone is known by any spelling Git reads as true', (context) => {
  const origin = repositoryWith(context, [
    { 'a.ts': 'one\ntwo\nthree\nfour\n' },
  ]);
  rmSync(join(origin, 'a.ts'));
  commitFiles(origin, { 'b.ts': 'one\ntwo\nthree\nfour\nfive\n' });
  const clone = partialCloneOf(context, origin);

  for (const spelling of [
    'ON',
    'yes',
    '1',
    '2k',
    '0x1a',
    '0x12',
    '0x1ab',
    '-010',
  ]) {
    runGit(clone, ['config', 'remote.origin.promisor', spelling]);

    assert.deepEqual(
      churn(gitOf(clone), '2025-11-23'),
      {
        commits: new Map([
          ['a.ts', 2],
          ['b.ts', 1],
        ]),
        limits: ['partial'],
      },
      spelling,
    );
  }
});

for (const filter of [
  'tree:0',
  'combine:blob:none+tree:0',
  'combine:blob:none+blob:limit=1k+tree:0',
]) {
  test(`a treeless clone (${filter}) has no commit counts, since its older commits list no files`, (context) => {
    const clone = partialCloneOf(
      context,
      repositoryWith(context, [{ 'a.ts': 'one' }, { 'a.ts': 'two' }]),
      filter,
    );

    assert.equal(churn(gitOf(clone), '2025-11-23'), 'treeless');
  });
}

const gitWithConfig =
  (config: string): Git =>
  (args) =>
    args[0] === 'config' ? config : '';

test('a remote without a promisor key or a true value leaves the clone whole', () => {
  const configs = [
    'remote.origin.promisor=false',
    'remote.origin.promisor=off',
    'remote.origin.promisor=0',
    'remote.origin.promisor=0x0',
    'remote.origin.promisor=xtrue',
    'remote.origin.promisor=true1',
    'remote.origin.promisors=true',
    'branch.remote.x.promisor=true',
    'alias.p=extensions.partialclone=origin',
    'alias.t=remote.origin.partialclonefilter=tree:0',
  ];

  for (const config of configs) {
    assert.deepEqual(
      churn(gitWithConfig(`${config}\n`), '2025-11-23'),
      { commits: new Map(), limits: [] },
      config,
    );
  }
});

test('a promisor key with no value marks a partial clone', () => {
  assert.deepEqual(
    churn(gitWithConfig('remote.origin.promisor\n'), '2025-11-23'),
    {
      commits: new Map(),
      limits: ['partial'],
    },
  );
});

test("a log format in the repository's own config names no file", (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  runGit(root, ['config', 'format.pretty', 'format:x%x09y.ts']);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), {
    commits: new Map([['a.ts', 1]]),
    limits: [],
  });
});

test("a rename is followed even when the repository's config turns rename detection off", (context) => {
  const root = repositoryWith(context, [
    { 'a.ts': 'one\ntwo\nthree\nfour\nfive\nsix\n' },
  ]);
  runGit(root, ['mv', 'a.ts', 'b.ts']);
  runGit(root, ['commit', '-q', '-m', 'rename']);
  runGit(root, ['config', 'diff.renames', 'false']);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), {
    commits: new Map([['b.ts', 2]]),
    limits: [],
  });
});

test('a repository without commits has nothing to count', (context) => {
  const root = repositoryWith(context, []);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), {
    commits: new Map(),
    limits: [],
  });
});

test('a file named HEAD is counted like any other file', (context) => {
  const root = repositoryWith(context, [{ HEAD: 'one', 'a.ts': 'one' }]);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), {
    commits: new Map([
      ['HEAD', 1],
      ['a.ts', 1],
    ]),
    limits: [],
  });
});

test("counting the commits runs no signature program the repository's own config names", (context) => {
  const hook = folderWith(context, {
    'gpg.sh': '#!/bin/sh\ntouch "$(dirname "$0")/ran"\n',
  });
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  const signature = [
    'gpgsig -----BEGIN PGP SIGNATURE-----',
    ' ',
    ' c2lnbmF0dXJl',
    ' -----END PGP SIGNATURE-----',
  ];
  const signed = runGit(root, ['cat-file', 'commit', 'HEAD']).replace(
    /^committer .*$/m,
    (line) => [line, ...signature].join('\n'),
  );
  writeFiles(hook, { commit: signed });
  runGit(root, [
    'update-ref',
    'HEAD',
    runGit(root, [
      'hash-object',
      '-t',
      'commit',
      '-w',
      join(hook, 'commit'),
    ]).trim(),
  ]);
  runGit(root, ['config', 'log.showSignature', 'true']);
  runGit(root, [
    'config',
    'gpg.program',
    `${hook.replaceAll('\\', '/')}/gpg.sh`,
  ]);

  churn(gitOf(root), '2025-11-23');

  assert.equal(existsSync(join(hook, 'ran')), false);
});

test("counting the commits reads no order file the repository's own config names", (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  runGit(root, [
    'config',
    'diff.orderFile',
    join(folderWith(context, {}), 'order'),
  ]);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), {
    commits: new Map([['a.ts', 1]]),
    limits: [],
  });
});

test('counting the commits reads no commit graph that the chain names outside its folder', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  runGit(root, ['commit-graph', 'write', '--reachable', '--split']);
  const chain = join(
    root,
    '.git',
    'objects',
    'info',
    'commit-graphs',
    'commit-graph-chain',
  );
  const line = readFileSync(chain, 'utf8').trim();
  chmodSync(chain, 0o644);
  // Git reads the hash from the start of the line and opens graph-<the whole line>.graph; a link could lead there.
  writeFileSync(chain, `${line}/../../../../../out/g\n`);
  writeFiles(root, { 'out/g.graph': 'four' });
  const trace = join(folderWith(context, {}), 'trace.json');
  setForTest(context, 'GIT_TRACE2_EVENT', trace);

  churn(gitOf(root), '2025-11-23');

  // Git reports a graph it read and found too small as an error event.
  assert.doesNotMatch(
    readFileSync(trace, 'utf8'),
    /commit-graph file is too small/,
  );
});

test('counting the commits reads no pack that the multi-pack-index names outside the pack folder', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  runGit(root, ['repack', '-adq', '--write-midx']);
  const pack = join(root, '.git', 'objects', 'pack');
  const name = (
    readdirSync(pack).find((file) => file.endsWith('.idx')) ?? ''
  ).replace(/\.idx$/, '');
  // The same length as the name it replaces, so the index keeps its layout; a link in the work tree could lead there.
  const outside = `pack-${name.slice('../../../out/pack-'.length)}`;
  mkdirSync(join(root, 'out'));

  // Git before 2.41 writes no .rev file by default.
  for (const file of readdirSync(pack).filter((each) =>
    each.startsWith(`${name}.`),
  )) {
    renameSync(
      join(pack, file),
      join(root, 'out', `${outside}${file.slice(name.length)}`),
    );
  }

  const index = join(pack, 'multi-pack-index');
  const bytes = readFileSync(index);
  Buffer.from(`../../../out/${outside}.idx`).copy(
    bytes,
    bytes.indexOf(`${name}.idx`),
  );
  writeFileSync(index, bytes);

  // Only that pack holds the commit, so Git finds no commit to count unless it read the pack.
  assert.deepEqual(churn(gitOf(root), '2025-11-23'), {
    commits: new Map(),
    limits: [],
  });
});

// attr.tree, which keeps Git from reading attributes from the work tree, came with Git 2.43.
test(
  'counting the commits reads no attributes file in the work tree, which a link could lead to a share',
  { skip: !gitAtLeast(2, 43) },
  (context) => {
    const root = repositoryWith(context, [
      { 'a/b/x.ts': 'one\ntwo\nthree\nfour\nfive\nsix\n' },
    ]);
    renameSync(join(root, 'a', 'b', 'x.ts'), join(root, 'a', 'b', 'y.ts'));
    commitFiles(root, {
      'a/b/y.ts': 'one\ntwo\nthree\nfour\nfive\nsix\nseven\n',
    });
    // Git warns that a macro is not allowed here whenever it reads this file.
    writeFiles(root, { 'a/.gitattributes': '[attr]probe text\n' });
    const git: Git = (args) => {
      const run = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
      assert.doesNotMatch(run.stderr, /gitattributes/);

      return run.stdout;
    };

    assert.deepEqual(churn(git, '2025-11-23'), {
      commits: new Map([['a/b/y.ts', 2]]),
      limits: [],
    });
  },
);

test('a branch without commits has nothing to count, whatever other branches hold', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'one' }]);
  runGit(root, ['checkout', '-q', '--orphan', 'fresh']);

  assert.deepEqual(churn(gitOf(root), '2025-11-23'), {
    commits: new Map(),
    limits: [],
  });
});
