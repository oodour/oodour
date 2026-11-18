import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

test('a folder made by tempDir is gone once the process exits', () => {
  const module = new URL('temp-dir.ts', import.meta.url).href;
  const script = `import { tempDir } from ${JSON.stringify(module)}; console.log(tempDir('temp-dir-test-'));`;
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf8' });
  const dir = child.stdout.trim();

  assert.equal(child.status, 0, child.stderr);
  assert.notEqual(dir, '');
  assert.equal(existsSync(dir), false);
});
