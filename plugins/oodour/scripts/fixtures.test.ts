import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  builtInMockForTest,
  folderWith,
  repositoryWith,
  runGit,
} from './fixtures.ts';

test("the tests' Git reads neither the system's nor the developer's config", (context) => {
  const root = repositoryWith(context, []);
  const origins = runGit(root, ['config', '--show-origin', '--list'])
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => line.slice(0, line.indexOf('\t')));

  assert.deepEqual(
    [...new Set(origins)],
    ['file:.git/config', 'command line:'],
  );
});

test('a repository with the commits of one built before is a copy of it, made without starting Git', (context) => {
  const commits = [{ 'a.ts': 'one' }, { 'a.ts': 'two', 'b/c.ts': 'three' }];
  const first = repositoryWith(context, commits);
  const started = builtInMockForTest(context, () =>
    context.mock.method(childProcess, 'execFileSync'),
  );

  const second = repositoryWith(context, commits);

  assert.equal(started.mock.callCount(), 0);
  started.mock.restore();
  syncBuiltinESMExports();
  assert.equal(
    runGit(second, ['rev-parse', 'HEAD']),
    runGit(first, ['rev-parse', 'HEAD']),
  );
  assert.equal(readFileSync(join(second, 'b', 'c.ts'), 'utf8'), 'three');
  assert.equal(runGit(second, ['status', '--porcelain']), '');
});

test('_OODOUR_INTERNAL_TEST_TEMP names the temporary folder of the tests and of the programs they start', (context) => {
  const temp = join(folderWith(context, {}), 'temp');
  const script = `await import(${JSON.stringify(new URL('fixtures.ts', import.meta.url).href)}); console.log((await import('node:os')).tmpdir());`;

  const shown = childProcess.execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      encoding: 'utf8',
      env: { ...process.env, _OODOUR_INTERNAL_TEST_TEMP: temp },
    },
  );

  assert.equal(shown.trim(), temp);
  assert.ok(existsSync(temp));
});

test('a repository with other commits is built for them', (context) => {
  repositoryWith(context, [{ 'a.ts': 'one' }]);

  const other = repositoryWith(context, [{ 'a.ts': 'other' }]);

  assert.equal(readFileSync(join(other, 'a.ts'), 'utf8'), 'other');
  assert.equal(runGit(other, ['log', '--format=%s']), 'change\n');
});
