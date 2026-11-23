import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { isTest, sources } from './files.ts';

function folderWith(files: readonly string[]): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'lz-oop-files-')));

  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), '');
  }

  return root;
}

test("a repository's JavaScript and TypeScript files are its sources, named from its top folder", () => {
  const root = folderWith(['src/a.ts', 'src/b.jsx', 'src/types.d.ts', 'README.md', 'ignored/c.ts', '.gitignore']);
  writeFileSync(join(root, '.gitignore'), 'ignored/\n');
  execFileSync('git', ['init', '-q'], { cwd: root });

  assert.deepEqual(sources(root), { root, all: ['src/a.ts', 'src/b.jsx'], inScope: ['src/a.ts', 'src/b.jsx'] });
});

test('a folder of a repository scopes the sources to the files below it', () => {
  const root = folderWith(['lib/a.ts', 'lib-two/b.ts', 'c.ts']);
  execFileSync('git', ['init', '-q'], { cwd: root });

  assert.deepEqual(sources(join(root, 'lib')).inScope, ['lib/a.ts']);
});

test('a test file is named .test or .spec, or sits in a __tests__ folder', () => {
  const files = ['src/a.test.ts', 'src/b.spec.jsx', 'src/__tests__/c.ts', 'src/d.ts', 'src/testing.ts', 'latest.ts'];

  assert.deepEqual(files.map(isTest), [true, true, true, false, false, false]);
});

test('outside a repository the sources are the files below the scope, without node_modules', (context) => {
  const root = folderWith(['src/a.ts', 'node_modules/x/index.js', 'b.mjs']);
  process.env['GIT_CEILING_DIRECTORIES'] = tmpdir();
  context.after(() => {
    delete process.env['GIT_CEILING_DIRECTORIES'];
  });

  assert.deepEqual(sources(root), { root, all: ['b.mjs', 'src/a.ts'], inScope: ['b.mjs', 'src/a.ts'] });
});
