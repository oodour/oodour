import assert from 'node:assert/strict';
import { test } from 'node:test';
import { repositoryWith, runGit } from './fixtures.ts';

test("the tests' Git reads neither the system's nor the developer's config", (context) => {
  const root = repositoryWith(context, []);
  const origins = runGit(root, ['config', '--show-origin', '--list'])
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => line.slice(0, line.indexOf('\t')));

  assert.deepEqual([...new Set(origins)], ['file:.git/config', 'command line:']);
});
