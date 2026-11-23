import assert from 'node:assert/strict';
import { symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { cachedLocalPath, localPath, placeBelow } from './below.ts';
import { folderWith } from './fixtures.ts';

test('a path with no link on the way is direct, whether or not it exists', (context) => {
  const root = folderWith(context, { 'lib/a.ts': '' });
  const place = placeBelow(root);

  assert.deepEqual([place(join(root, 'lib', 'a.ts')), place(join(root, 'lib', 'missing', 'b.ts')), place(root)], ['direct', 'direct', 'direct']);
});

test('a name that starts with two dots is below the root', (context) => {
  const root = folderWith(context, { '..lib/a.ts': '', '..b.ts': '' });
  const place = placeBelow(root);

  assert.deepEqual([place(join(root, '..lib', 'a.ts')), place(join(root, '..b.ts'))], ['direct', 'direct']);
});

test('a path outside the root has no place', (context) => {
  const root = folderWith(context, {});

  assert.equal(placeBelow(join(root, 'inner'))(join(root, 'a.ts')), undefined);
});

test('a link whose target stays below the root is linked, a relative target read from the link', (context) => {
  const root = folderWith(context, { 'packages/lib/a.ts': '' });
  symlinkSync(join(root, 'packages', 'lib'), join(root, 'absolute'), 'junction');
  symlinkSync(join('packages', 'lib'), join(root, 'relative'), 'dir');

  assert.deepEqual([placeBelow(root)(join(root, 'absolute', 'a.ts')), placeBelow(root)(join(root, 'relative', 'a.ts'))], ['linked', 'linked']);
});

test('a link that leads outside the root has no place', (context) => {
  const outside = folderWith(context, { 'a.ts': '' });
  const root = folderWith(context, {});
  symlinkSync(join(outside, 'a.ts'), join(root, 'a.ts'), 'file');

  assert.equal(placeBelow(root)(join(root, 'a.ts')), undefined);
});

test('a path that steps back through a link leading outside has no place', (context) => {
  const outside = folderWith(context, { 'x/a.ts': '' });
  const root = folderWith(context, { 'a.ts': '' });
  symlinkSync(join(outside, 'x'), join(root, 'out'), 'junction');

  assert.equal(placeBelow(root)('out/../a.ts'), undefined);
});

// Windows stores a link's target with its `..` already applied, so only other systems can make this link.
test('a link target that steps back through a link leading outside has no place', { skip: process.platform === 'win32' }, (context) => {
  const outside = folderWith(context, { 'x/a.ts': '' });
  const root = folderWith(context, { 'sub/a.ts': '' });
  symlinkSync(join(outside, 'x'), join(root, 'sub', 'deep'), 'junction');
  symlinkSync(join('sub', 'deep', '..'), join(root, 'back'), 'dir');

  assert.equal(placeBelow(root)(join(root, 'back', 'a.ts')), undefined);
});

test('the local path of a path through links is where the links lead', (context) => {
  const elsewhere = folderWith(context, { 'x/a.ts': '' });
  const root = folderWith(context, {});
  symlinkSync(join(elsewhere, 'x'), join(root, 'link'), 'junction');

  assert.deepEqual([localPath(join(root, 'link', 'a.ts')), localPath(join(root, 'plain'))], [join(elsewhere, 'x', 'a.ts'), join(root, 'plain')]);
});

test('a path that is or leads to a network path has no local path', (context) => {
  const root = folderWith(context, {});
  symlinkSync('\\\\lz-oop-test.invalid\\share', join(root, 'share'), 'dir');

  assert.deepEqual([localPath(join(root, 'share', 'a.ts')), localPath('\\\\lz-oop-test.invalid\\share\\a.ts'), localPath('//lz-oop-test.invalid/share')], [undefined, undefined, undefined]);
});

test('a step back after a missing folder can still lead to a network path', (context) => {
  const root = folderWith(context, {});
  symlinkSync('\\\\lz-oop-test.invalid\\share', join(root, 'share'), 'dir');
  const local = cachedLocalPath();

  assert.deepEqual([local(join(root, 'missing', 'a.ts')), local(`${root}/missing/../share/a.ts`)], [join(root, 'missing', 'a.ts'), undefined]);
});

test('links that lead to each other have no place', (context) => {
  const root = folderWith(context, {});
  symlinkSync(join(root, 'b'), join(root, 'a'), 'dir');
  symlinkSync(join(root, 'a'), join(root, 'b'), 'dir');

  assert.equal(placeBelow(root)(join(root, 'a', 'c.ts')), undefined);
});
