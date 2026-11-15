// Holds the firewall's scripts to the script bar in ~/.claude/references/lars-skill-authoring.md
// (Lars, 2026-11-15: "Claude mod and hook scripts should meet the same bar as those I require for
// user-scope skill scripts"): every script is TypeScript, and a .test.ts imports it.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = import.meta.dirname;

// Each script folder and the folders its tests live in: beside the script, or a mod's .node-test.
const scriptFolders: readonly { readonly folder: string; readonly testFolders: readonly string[] }[] = [
  { folder: '.claude/hooks', testFolders: ['.claude/hooks'] },
  { folder: 'tools', testFolders: ['tools'] },
  { folder: '.claude/mods/oracle-scrub/hooks', testFolders: ['.claude/mods/oracle-scrub/hooks', '.claude/mods/oracle-scrub/.node-test'] },
];

const isScript = (name: string): boolean => name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts');

// A test imports the script: `from '<path>/<name>'`, `import '<path>/<name>'` or `import('<path>/<name>')`.
const namesScript = (testText: string, name: string): boolean => {
  const specifier = `['"][^'"\\n]*/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`;

  return new RegExp(`\\bfrom\\s*${specifier}|\\bimport\\s*\\(?\\s*${specifier}`).test(testText);
};

test('a script named only in a comment is not tested', () => {
  assert.equal(namesScript("// covered by './store-check.ts' elsewhere", 'store-check.ts'), false);
});

test('a script is tested when a test imports it in any import form', () => {
  assert.ok(namesScript("import { main } from './store-check.ts';", 'store-check.ts'));
  assert.ok(namesScript('import "../tools/store-check.ts";', 'store-check.ts'));
  assert.ok(namesScript("await import('./store-check.ts')", 'store-check.ts'));
  assert.equal(namesScript("import { x } from './my-store-check.ts';", 'store-check.ts'), false);
  assert.equal(namesScript("import { x } from './store-checkxts';", 'store-check.ts'), false);
});

for (const { folder, testFolders } of scriptFolders) {
  const files = readdirSync(join(root, folder));

  test(`${folder} holds TypeScript scripts only`, () => {
    assert.deepEqual(
      files.filter((name) => /\.(?:[cm]?js|mts|cts)$/.test(name)),
      [],
      'port every script to erasable-syntax .ts',
    );
  });

  test(`every script in ${folder} is imported by a test`, () => {
    const testText = testFolders
      .flatMap((dir) =>
        readdirSync(join(root, dir))
          .filter((name) => name.endsWith('.test.ts'))
          .map((name) => readFileSync(join(root, dir, name), 'utf8')),
      )
      .join('\n');
    // The engine's test kit loads register.ts by itself, so a mod's register.test.ts names it by existing.
    const untested = files
      .filter(isScript)
      .filter((name) => !namesScript(testText, name))
      .filter((name) => !(name === 'register.ts' && files.includes('register.test.ts')));

    assert.deepEqual(untested, []);
  });
}
