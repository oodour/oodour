import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

// Runs the statements in a child process after `const dir = tempDir(...)` and returns the child with the folder's path.
function runWithTempDir(statements: string): {
  readonly status: number | null;
  readonly stderr: string;
  readonly dir: string;
} {
  const module = new URL('temp-dir.ts', import.meta.url).href;
  const script = `import { rmSync } from 'node:fs'; import { tempDir } from ${JSON.stringify(module)}; const dir = tempDir('temp-dir-test-'); console.log(dir); ${statements}`;
  const child = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    { encoding: 'utf8' },
  );

  return {
    status: child.status,
    stderr: child.stderr,
    dir: child.stdout.trim(),
  };
}

test('a folder made by tempDir is gone once the process exits', () => {
  const child = runWithTempDir('');

  assert.equal(child.status, 0, child.stderr);
  assert.notEqual(child.dir, '');
  assert.equal(existsSync(child.dir), false);
});

test('the folder is gone too when the process is told to exit', () => {
  const child = runWithTempDir('process.exit(0);');

  assert.equal(child.status, 0, child.stderr);
  assert.notEqual(child.dir, '');
  assert.equal(existsSync(child.dir), false);
});

test('a folder the process removed itself does not fail the exit', () => {
  const child = runWithTempDir('rmSync(dir, { recursive: true });');

  assert.equal(child.status, 0, child.stderr);
});
