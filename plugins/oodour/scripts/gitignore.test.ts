import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ignoreFileIn, ignoresCase, isIgnored } from './gitignore.ts';

test('names differ by case on Linux only, as Git sets up a repository on Windows and macOS to ignore it', () => {
  assert.deepEqual(
    (['win32', 'darwin', 'linux'] as const).map((platform) =>
      ignoresCase(platform),
    ),
    [true, true, false],
  );
});

test("an ignore file's rule matches a name in another case only where case is ignored", () => {
  assert.deepEqual(
    [true, false].map((ignorecase) =>
      isIgnored([ignoreFileIn('', 'case.ts\n', ignorecase)], 'Case.ts', false),
    ),
    [true, false],
  );
});
