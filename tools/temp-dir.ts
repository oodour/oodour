import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const made: string[] = [];

process.on('exit', () => {
  for (const dir of made) {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
});

export function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);

  return dir;
}
