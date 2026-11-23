import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

const require = createRequire(import.meta.url);

function versionOf(manifest: string): unknown {
  const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'));

  return typeof parsed === 'object' && parsed !== null && 'version' in parsed ? parsed.version : undefined;
}

test("each package the scripts run is the version the plugin's package.json pins", () => {
  const plugin: unknown = JSON.parse(readFileSync(join(import.meta.dirname, '../package.json'), 'utf8'));
  const pins = typeof plugin === 'object' && plugin !== null && 'dependencies' in plugin ? plugin.dependencies : undefined;
  assert.ok(typeof pins === 'object' && pins !== null);

  for (const [name, pin] of Object.entries(pins)) {
    assert.equal(versionOf(require.resolve(`${name}/package.json`)), pin, name);
  }
});
