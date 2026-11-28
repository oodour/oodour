import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Stryker disable next-line ArrayDeclaration: removing a seeded name that is no folder does nothing, as force ignores a missing path
const made: string[] = [];

process.on('exit', () => {
  for (const dir of made) {
    // Stryker disable next-line LzJsNumericLiteral: a retry happens only while another process holds the folder, which no test can stage a set number of times
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
});

export function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);

  return dir;
}
