import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { test } from 'node:test';
import { folderWith, networkShare, refusedByGit, repositoryWith, setForTest } from './fixtures.ts';
import { runCommand } from './lz-oop.ts';

const cli = join(import.meta.dirname, 'lz-oop.ts');
const usage = 'usage: node lz-oop.ts [--trusted-repository] hotspots [--since <date>] [--limit <count>] [-- <folder>]\n';

test('hotspots prints the hot-spot report for the scope it is given, counting commits in a trusted repository', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'export const a = (n: number) => (n > 0 ? n : 0);' }]);

  const run = spawnSync(
    process.execPath,
    [cli, '--trusted-repository', 'hotspots', root, '--since', '2 years ago', '--limit', '5'],
    { encoding: 'utf8' },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^Hot spots in .+: 1 production files, commits since 2 years ago\.\nHistory: the full history/);
  assert.match(run.stdout, /\n\| a\.ts \| 1 \| 0, 0 \| Arrow function, line 1: 2 \| no \| none \| simple \|\n/);
});

test('a repository not trusted gets no commit counts, and its history line says how to trust it', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'export const a = (n: number) => (n > 0 ? n : 0);' }]);

  const { status, stdout } = runCommand(['hotspots', root]);

  assert.equal(status, 0);
  assert.match(stdout, /^Hot spots in .+: 1 production files, commits since 12 months ago\.\n/);
  assert.match(
    stdout,
    /\nHistory: a repository not trusted with --trusted-repository, so no commit counts, and no file counts as often changed\.\n/,
  );
  assert.match(stdout, /\n\| a\.ts \| - \| 0, 0 \|/);
});

test('a relative folder, and no folder at all, are read from the working folder', (context) => {
  const root = repositoryWith(context, [{ 'lib/a.ts': 'export const a = 1;', 'b.ts': 'export const b = 1;' }]);

  const runs = [['hotspots', 'lib'], ['hotspots']].map((args) =>
    spawnSync(process.execPath, [cli, '--trusted-repository', ...args], { cwd: root, encoding: 'utf8' }),
  );

  assert.deepEqual(
    runs.map(({ stdout }) => stdout.match(/^Hot spots in [^:]*|^\| (?!File|---)\S+/gm)),
    [
      ['Hot spots in lib', '| lib/a.ts'],
      ['Hot spots in .', '| b.ts', '| lib/a.ts'],
    ],
  );
});

test('a git program in the working folder is not the Git that runs', { skip: process.platform !== 'win32' }, (context) => {
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  copyFileSync(join(process.env['SystemRoot'] ?? 'C:/Windows', 'System32', 'hostname.exe'), join(root, 'git.exe'));
  const env = { ...process.env };
  Reflect.deleteProperty(env, 'NoDefaultCurrentDirectoryInExePath');

  const run = spawnSync(process.execPath, [cli, '--trusted-repository', 'hotspots'], { cwd: root, encoding: 'utf8', env });

  assert.deepEqual([run.status, run.stderr], [0, '']);
});

test('a limit of 1 lists one file, with nothing on stderr', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'export const a = 1;', 'b.ts': 'export const b = 1;' }]);

  const { status, stdout, stderr } = runCommand(['hotspots', root, '--limit', '1']);

  assert.deepEqual([status, stderr, stdout.match(/^\| (?!File|---)\S+/gm)?.length], [0, '', 1]);
});

test('the command line writes a refusal to stderr and exits with its status', () => {
  const run = spawnSync(process.execPath, [cli, 'churn'], { encoding: 'utf8' });

  assert.deepEqual([run.status, run.stdout, run.stderr], [2, '', `lz-oop: unknown command churn\n${usage}`]);
});

test('a repository not trusted starts no Git process, and a trusted one does', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': '' }]);
  const trace = join(folderWith(context, {}), 'trace');
  setForTest(context, 'GIT_TRACE', trace);

  runCommand(['hotspots', root]);
  const tracedUntrusted = existsSync(trace);
  runCommand(['--trusted-repository', 'hotspots', root]);

  assert.deepEqual({ tracedUntrusted, tracedTrusted: existsSync(trace) }, { tracedUntrusted: false, tracedTrusted: true });
});

test('a folder that does not exist is named on stderr with exit 1', () => {
  const missing = join(tmpdir(), 'lz-oop-no-such-folder');

  assert.deepEqual(runCommand(['hotspots', missing]), { status: 1, stdout: '', stderr: `lz-oop: no folder ${missing}\n` });
});

test('a network or device path is refused before anything reads it, with exit 1', { skip: process.platform !== 'win32' }, (context) => {
  const device = `\\\\?\\${repositoryWith(context, [{ 'a.ts': '' }])}`;

  assert.deepEqual(runCommand(['hotspots', device]), {
    status: 1,
    stdout: '',
    stderr: `lz-oop: ${device} is a network or device path, or leads to one; audit a local folder\n`,
  });
});

test('a folder that leads to a network path through a link is refused before anything reads it', (context) => {
  const root = repositoryWith(context, []);
  const scope = join(root, 'share');
  symlinkSync(networkShare, scope, 'dir');

  assert.deepEqual(runCommand(['hotspots', scope]), {
    status: 1,
    stdout: '',
    stderr: `lz-oop: ${scope} is a network or device path, or leads to one; audit a local folder\n`,
  });
});

test('a scope that steps back after a link is read as its text names it, so a link to a network path is refused', (context) => {
  const root = repositoryWith(context, [{ 'elsewhere/inner/a.ts': '' }]);
  symlinkSync(join(root, 'elsewhere', 'inner'), join(root, 'link'), 'junction');
  symlinkSync(networkShare, join(root, 'evil'), 'dir');
  const scope = [root, 'link', '..', 'evil'].join(sep);

  assert.deepEqual(runCommand(['hotspots', scope]), {
    status: 1,
    stdout: '',
    stderr: `lz-oop: ${scope} is a network or device path, or leads to one; audit a local folder\n`,
  });
});

test('a repository Git refuses fails with what Git said and exit 1', (context) => {
  const root = repositoryWith(context, []);
  refusedByGit(context);

  const result = runCommand(['--trusted-repository', 'hotspots', root]);

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
    [['hotspots', '.', '--trusted-repository'], '--trusted-repository goes first, before the command'],
  ];

  for (const [args, reason] of cases) {
    const result = runCommand(args);

    assert.deepEqual([result.status, result.stdout], [2, ''], args.join(' '));
    assert.ok(result.stderr.startsWith(`lz-oop: ${reason}`), result.stderr);
    assert.ok(result.stderr.endsWith(`\n${usage}`), result.stderr);
  }
});
