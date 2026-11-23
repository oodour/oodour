import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refusedByGit, repositoryWith } from './fixtures.ts';
import { runCommand } from './lz-oop.ts';

const cli = join(import.meta.dirname, 'lz-oop.ts');
const usage = 'usage: node lz-oop.ts hotspots [<folder>] [--since <date>] [--limit <count>]\n';

test('hotspots prints the hot-spot report for the scope it is given', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'export const a = (n: number) => (n > 0 ? n : 0);' }]);

  const run = spawnSync(process.execPath, [cli, 'hotspots', root, '--since', '2 years ago', '--limit', '5'], {
    encoding: 'utf8',
  });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^Hot spots in .+: 1 production files, commits since 2 years ago\.\n/);
  assert.match(run.stdout, /\n\| a\.ts \| 1 \| 0, 0 \| Arrow function, line 1: 2 \| no \| none \| simple \|\n/);
});

test('a folder that does not exist is named on stderr with exit 1', () => {
  const missing = join(tmpdir(), 'lz-oop-no-such-folder');

  assert.deepEqual(runCommand(['hotspots', missing]), { status: 1, stdout: '', stderr: `lz-oop: no folder ${missing}\n` });
});

test('a repository Git refuses fails with what Git said and exit 1', (context) => {
  const root = repositoryWith(context, []);
  refusedByGit(context);

  const result = runCommand(['hotspots', root]);

  assert.deepEqual([result.status, result.stdout], [1, '']);
  assert.match(result.stderr, /^lz-oop: git: .*dubious ownership/s);
});

test('a wrong argument is named above the usage, with exit 2', () => {
  const cases: readonly (readonly [readonly string[], string])[] = [
    [[], 'no command'],
    [['churn', '.'], 'unknown command churn'],
    [['hotspots', 'a', 'b'], 'one folder at most, not b'],
    [['hotspots', '--depth', '3'], "Unknown option '--depth'"],
    [['hotspots', '--limit', 'ten'], '--limit takes a whole number of 1 or more, not ten'],
    [['hotspots', '--limit', '0'], '--limit takes a whole number of 1 or more, not 0'],
  ];

  for (const [args, reason] of cases) {
    const result = runCommand(args);

    assert.deepEqual([result.status, result.stdout], [2, ''], args.join(' '));
    assert.ok(result.stderr.startsWith(`lz-oop: ${reason}`), result.stderr);
    assert.ok(result.stderr.endsWith(`\n${usage}`), result.stderr);
  }
});
