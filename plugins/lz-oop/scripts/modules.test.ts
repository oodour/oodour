import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { type TestContext, test } from 'node:test';
import { folderWith } from './fixtures.ts';
import { dependentsThroughReexports, readModules } from './modules.ts';

function modulesOf(context: TestContext, files: Readonly<Record<string, string>>, prepare?: (root: string) => void) {
  const root = folderWith(context, files);
  prepare?.(root);

  return readModules(
    root,
    Object.keys(files).filter((file) => /(?<!\.d)\.[cm]?[jt]sx?$/.test(file)),
  );
}

function linkPackage(root: string, name: string, folder: string): void {
  mkdirSync(dirname(join(root, 'node_modules', name)), { recursive: true });
  symlinkSync(join(root, folder), join(root, 'node_modules', name), 'junction');
}

test('a relative import names the file it resolves to', (context) => {
  const modules = modulesOf(context, { 'src/a.ts': "import { b } from './b';", 'src/b.ts': 'export const b = 1;' });

  assert.deepEqual(modules.get('src/a.ts')?.imports, ['src/b.ts']);
});

test('a dynamic import, a require call and an export from a file each name the file', (context) => {
  const modules = modulesOf(context, {
    'a.js': "export * from './b.js'; const c = require('./c'); const d = await import('./d.mjs');",
    'b.js': '',
    'c.js': '',
    'd.mjs': '',
  });

  assert.deepEqual(modules.get('a.js')?.imports, ['b.js', 'c.js', 'd.mjs']);
});

test("an import through a path the nearest tsconfig.json maps names the file it maps to", (context) => {
  const modules = modulesOf(context, {
    'tsconfig.json': '{ "compilerOptions": { "paths": { "@lib/*": ["./lib/*"] } } }',
    'app/a.ts': "import { b } from '@lib/b';",
    'lib/b.ts': 'export const b = 1;',
  });

  assert.deepEqual(modules.get('app/a.ts')?.imports, ['lib/b.ts']);
});

test('an import by the name of a package linked into node_modules names its source file', (context) => {
  const files = {
    'packages/lib/package.json': '{ "name": "@demo/lib", "exports": "./src/index.ts" }',
    'packages/lib/src/index.ts': 'export const b = 1;',
    'packages/app/src/a.ts': "import { b } from '@demo/lib';",
  };
  const modules = modulesOf(context, files, (root) => {
    linkPackage(root, '@demo/lib', 'packages/lib');
  });

  assert.deepEqual(modules.get('packages/app/src/a.ts')?.imports, ['packages/lib/src/index.ts']);
});

test('an import resolves with the conditions of the importing file, an ES module here', (context) => {
  const files = {
    'tsconfig.json': '{ "compilerOptions": { "module": "nodenext", "moduleResolution": "nodenext" } }',
    'package.json': '{ "type": "module" }',
    'packages/lib/package.json': '{ "name": "@demo/lib", "type": "module", "exports": { ".": { "import": "./src/index.ts" } } }',
    'packages/lib/src/index.ts': 'export const b = 1;',
    'packages/app/src/a.ts': "import { b } from '@demo/lib';",
  };
  const modules = modulesOf(context, files, (root) => {
    linkPackage(root, '@demo/lib', 'packages/lib');
  });

  assert.deepEqual(modules.get('packages/app/src/a.ts')?.imports, ['packages/lib/src/index.ts']);
});

test('an import of a JavaScript file with a declaration file beside it names the JavaScript file', (context) => {
  const modules = modulesOf(context, {
    'a.js': "import { b } from './lib.js'; import { c } from './other.mjs';",
    'lib.js': 'export const b = 1;',
    'lib.d.ts': 'export declare const b: number;',
    'other.mjs': 'export const c = 1;',
    'other.d.mts': 'export declare const c: number;',
  });

  assert.deepEqual(modules.get('a.js')?.imports, ['lib.js', 'other.mjs']);
});

test('a file whose statements only pass on what other files export only re-exports', (context) => {
  const modules = modulesOf(context, {
    'index.ts': "export * from './a'; export { b } from './b'; import { c } from './c'; export { c };",
    'a.ts': 'export const a = 1;',
    'b.ts': "export { a } from './a'; export const b = 2;",
    'c.ts': '',
  });

  assert.deepEqual(
    ['index.ts', 'a.ts', 'b.ts', 'c.ts'].map((file) => modules.get(file)?.reexportsOnly),
    [true, false, false, false],
  );
});

test('the concrete classes of a file are the classes it exports that are not abstract', (context) => {
  const modules = modulesOf(context, {
    'a.ts': [
      'export class A {}',
      'export abstract class B {}',
      'class C {}',
      'export default class D {}',
      'export interface E {}',
    ].join('\n'),
  });

  assert.deepEqual(modules.get('a.ts')?.concreteClasses, ['A', 'D']);
});

test('a file names the concrete classes it imports from other files and the classes of its own it creates', (context) => {
  const modules = modulesOf(context, {
    'a.ts': [
      "import { Store as Shelf, type Port } from './store';",
      "import Clock from './clock';",
      "import { format } from './format';",
      'class Local {}',
      'class Unused {}',
      'const local = new Local();',
      'const date = new Date();',
    ].join('\n'),
    'store.ts': 'export class Store {}\nexport interface Port {}',
    'clock.ts': 'export default class SystemClock {}',
    'format.ts': 'export function format() {}',
  });

  assert.deepEqual(modules.get('a.ts')?.concreteClassesNamed, ['Local', 'Store', 'SystemClock']);
});

test('a concrete class imported through files that re-export it is named', (context) => {
  const modules = modulesOf(context, {
    'store.ts': 'export class Store {}',
    'index.ts': "export * from './store';",
    'barrel.ts': "export { Store as Shelf } from './index';",
    'a.ts': "import { Store } from './index';",
    'b.ts': "import { Shelf } from './barrel';",
  });

  assert.deepEqual(
    ['a.ts', 'b.ts'].map((file) => modules.get(file)?.concreteClassesNamed),
    [['Store'], ['Store']],
  );
});

test('the dependents of a file are the files that import it, directly or through files that only re-export it', (context) => {
  const modules = modulesOf(context, {
    'lib.ts': 'export const lib = 1;',
    'index.ts': "export * from './lib';",
    'barrel.ts': "export * from './index';",
    'a.ts': "import { lib } from './lib';",
    'b.ts': "import { lib } from './barrel';",
    'c.ts': "import { a } from './a';",
  });

  assert.deepEqual(dependentsThroughReexports(modules).get('lib.ts'), ['a.ts', 'b.ts']);
});
