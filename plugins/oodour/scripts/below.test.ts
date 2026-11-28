import assert from 'node:assert/strict';
import fs, { mkdirSync, symlinkSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { basename, join, parse, sep } from 'node:path';
import { test } from 'node:test';
import { cachedLocalPath, childPath, localPath, pathBelow, placeBelow } from './below.ts';
import { folderWith, networkShare } from './fixtures.ts';

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
  // Not `join`, which would take the `..` by its text and make the link lead to `sub`.
  symlinkSync('sub/deep/..', join(root, 'back'), 'dir');

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
  symlinkSync(networkShare, join(root, 'share'), 'dir');

  assert.deepEqual([localPath(join(root, 'share', 'a.ts')), localPath(`${networkShare}${sep}a.ts`), localPath('//oodour-test.invalid/share')], [undefined, undefined, undefined]);
});

test('a step back after a missing folder can still lead to a network path', (context) => {
  const root = folderWith(context, {});
  symlinkSync(networkShare, join(root, 'share'), 'dir');
  const local = cachedLocalPath();

  assert.deepEqual([local(join(root, 'missing', 'a.ts')), local(`${root}/missing/../share/a.ts`)], [join(root, 'missing', 'a.ts'), undefined]);
});

test('the parent of the root, or a path through it, is not below the root', (context) => {
  const root = folderWith(context, {});

  assert.deepEqual([pathBelow(root, '..'), pathBelow(root, join('..', 'a.ts')), pathBelow(root, 'a.ts')], [undefined, undefined, 'a.ts']);
});

test('a relative path that steps back past the root has no place, even after a dot or an empty segment', (context) => {
  const root = folderWith(context, { 'lib/a.ts': '' });
  const place = placeBelow(root);

  assert.deepEqual(
    [place('../a.ts'), place('lib/./../../a.ts'), place('lib//../../a.ts'), place('lib/../a.ts')],
    [undefined, undefined, undefined, 'direct'],
  );
});

test('an absolute path that steps back out of the root, or back through a link leading outside, has no place', (context) => {
  const outside = folderWith(context, { 'x/a.ts': '' });
  const root = folderWith(context, { 'a.ts': '' });
  symlinkSync(join(outside, 'x'), join(root, 'out'), 'junction');
  const place = placeBelow(root);

  assert.deepEqual(
    [place(`${root}${sep}lib${sep}..${sep}..${sep}${basename(root)}${sep}a.ts`), place(`${root}${sep}out${sep}..${sep}a.ts`)],
    [undefined, undefined],
  );
});

test('a link whose relative target leads outside has no place', (context) => {
  const outside = folderWith(context, { 'x/a.ts': '' });
  const root = folderWith(context, { 'a.ts': '' });
  symlinkSync(join('..', basename(outside), 'x'), join(root, 'out'), 'dir');

  assert.equal(placeBelow(root)(join(root, 'out', 'a.ts')), undefined);
});

test('a path through forty links has a place and one through forty-one has none', (context) => {
  const root = folderWith(context, { 'end/a.ts': '' });
  const chainOf = (name: string, count: number): void => {
    for (let index = 0; index < count; index += 1) {
      symlinkSync(index + 1 < count ? `${name}${String(index + 1)}` : 'end', join(root, `${name}${String(index)}`), 'dir');
    }
  };
  chainOf('forty', 40);
  chainOf('more', 41);
  const place = placeBelow(root);

  assert.deepEqual([place(join(root, 'forty0', 'a.ts')), place(join(root, 'more0', 'a.ts'))], ['linked', undefined]);
});

test('a child of the filesystem root takes no second separator', (context) => {
  const root = folderWith(context, {});
  const filesystemRoot = parse(root).root;

  assert.deepEqual([childPath(filesystemRoot, 'a.ts'), childPath(root, 'a.ts')], [`${filesystemRoot}a.ts`, `${root}${sep}a.ts`]);
});

test('two separators inside a path do not make it a network path', (context) => {
  const root = folderWith(context, {});

  assert.equal(localPath(`${root}${sep}${sep}a.ts`), join(root, 'a.ts'));
});

test('a path the system refuses to read for another reason than an unreachable entry throws', (context) => {
  const root = folderWith(context, {});

  assert.throws(() => localPath(join(root, 'a\0b.ts')), { code: 'ERR_INVALID_ARG_VALUE' });
});

test('nothing below a missing entry is read, not even a name the system refuses to read', (context) => {
  const root = folderWith(context, {});
  const below = join(root, 'missing', 'a\0b.ts');

  assert.equal(localPath(below), below);
});

// The system's refusals are replaced for the test: no one account and system gives all three for an entry on disk.
test('nothing below an entry the system cannot reach is read, so a link there is not followed', (context) => {
  const elsewhere = folderWith(context, { 'a.ts': '' });
  const root = folderWith(context, {});
  const codes = ['ENOTDIR', 'ENAMETOOLONG', 'EACCES'];

  for (const code of codes) {
    mkdirSync(join(root, code));
    symlinkSync(elsewhere, join(root, code, 'link'), 'junction');
  }

  const original = fs.lstatSync;
  const replaced = context.mock.method(fs, 'lstatSync', (path: string, options: { readonly throwIfNoEntry: false }) => {
    const code = codes.find((name) => path === join(root, name));

    if (code !== undefined) {
      throw Object.assign(new Error(`${code}: unreachable`), { code });
    }

    return original(path, options);
  });
  syncBuiltinESMExports();
  context.after(() => {
    replaced.mock.restore();
    syncBuiltinESMExports();
  });
  const through = codes.map((code) => join(root, code, 'link', 'a.ts'));

  assert.deepEqual(through.map(localPath), through);
});

test('the cached local path reads each entry once, so a link made afterwards goes unseen', (context) => {
  const elsewhere = folderWith(context, { 'a.ts': '' });
  const root = folderWith(context, {});
  const local = cachedLocalPath();
  const before = local(join(root, 'later', 'a.ts'));
  symlinkSync(elsewhere, join(root, 'later'), 'junction');

  assert.deepEqual(
    [before, local(join(root, 'later', 'a.ts')), localPath(join(root, 'later', 'a.ts'))],
    [join(root, 'later', 'a.ts'), join(root, 'later', 'a.ts'), join(elsewhere, 'a.ts')],
  );
});

test('links that lead to each other have no place', (context) => {
  const root = folderWith(context, {});
  symlinkSync(join(root, 'b'), join(root, 'a'), 'dir');
  symlinkSync(join(root, 'a'), join(root, 'b'), 'dir');

  assert.equal(placeBelow(root)(join(root, 'a', 'c.ts')), undefined);
});
