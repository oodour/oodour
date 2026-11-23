import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

const require = createRequire(import.meta.url);

function jsonField(path: string, field: string): unknown {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

  return typeof parsed === 'object' && parsed !== null ? Object.entries(parsed).find(([key]) => key === field)?.[1] : undefined;
}

test("each package the scripts run is the version the plugin's package.json pins", () => {
  const pins = jsonField(join(import.meta.dirname, '../package.json'), 'dependencies');
  assert.ok(typeof pins === 'object' && pins !== null);

  for (const [name, pin] of Object.entries(pins)) {
    assert.equal(jsonField(require.resolve(`${name}/package.json`), 'version'), pin, name);
  }
});
