import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { folderWith, outsideAnyRepository, repositoryWith, runGit } from './fixtures.ts';
import { isTest, sources } from './files.ts';
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

  assert.deepEqual(sources(root, gitIn(root)), { root, all: ['src/a.ts', 'src/b.jsx'], inScope: ['src/a.ts', 'src/b.jsx'] });
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

test('a test file is named .test or .spec, or sits in a __tests__ folder', () => {
  const files = ['src/a.test.ts', 'src/b.spec.jsx', 'src/__tests__/c.ts', 'src/d.ts', 'src/testing.ts', 'latest.ts'];

  assert.deepEqual(files.map(isTest), [true, true, true, false, false, false]);
});

test('outside a repository the sources are the files below the scope, without node_modules or folders', (context) => {
  const root = folderWith(context, { 'src/a.ts': '', 'node_modules/x/index.js': '', 'b.mjs': '', 'chart.js/README.md': '' });
  outsideAnyRepository(context);

  assert.deepEqual(sources(root, undefined), { root, all: ['b.mjs', 'src/a.ts'], inScope: ['b.mjs', 'src/a.ts'] });
});
