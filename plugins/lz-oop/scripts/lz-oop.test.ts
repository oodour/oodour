import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runCommand } from './lz-oop.ts';

const cli = join(import.meta.dirname, 'lz-oop.ts');

test('hotspots prints the hot-spot report for the scope it is given', () => {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'lz-oop-cli-')));
  writeFileSync(join(root, 'a.ts'), 'export const a = (n: number) => (n > 0 ? n : 0);');
  const git = (args: readonly string[]): void => {
    execFileSync('git', ['-c', 'user.name=lz-oop', '-c', 'user.email=lz-oop', ...args], { cwd: root });
  };
  git(['init', '-q']);
  git(['add', '.']);
  git(['commit', '-q', '-m', 'add']);

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

test('no command, another command, an extra folder, an unknown option or a limit that is no count print the usage and exit 2', () => {
  for (const args of [
    [],
    ['churn', '.'],
    ['hotspots', 'a', 'b'],
    ['hotspots', '--depth', '3'],
    ['hotspots', '--limit', 'ten'],
    ['hotspots', '--limit', '0'],
  ]) {
    assert.deepEqual(
      runCommand(args),
      { status: 2, stdout: '', stderr: 'usage: node lz-oop.ts hotspots [<folder>] [--since <date>] [--limit <count>]\n' },
      args.join(' '),
    );
  }
});
