import assert from 'node:assert/strict';
import { win32 } from 'node:path';
import { test } from 'node:test';
import { pathSegments, resolvePath } from '../hooks/paths.ts';

test('a relative path splits into its segments', () => {
  assert.deepEqual(pathSegments('a/b'), ['a', 'b']);
});

test('a backslash separates segments as a slash does', () => {
  assert.deepEqual(pathSegments('a\\b'), ['a', 'b']);
});

test('empty and dot segments are dropped', () => {
  assert.deepEqual(pathSegments('a//./b/'), ['a', 'b']);
});

test('a parent segment removes the segment before it', () => {
  assert.deepEqual(pathSegments('a/x/../b'), ['a', 'b']);
});

test('a relative path keeps the parent segments it cannot remove', () => {
  assert.deepEqual(pathSegments('../../a'), ['..', '..', 'a']);
});

test('a parent segment at a drive root stays at the root', () => {
  assert.deepEqual(pathSegments('D:\\..\\x'), ['D:', 'x']);
});

test('a parent segment at a root without a drive stays at the root', () => {
  assert.deepEqual(pathSegments('\\..\\x'), ['x']);
});

test('a parent segment removes a named segment that follows a kept parent segment', () => {
  assert.deepEqual(pathSegments('../a/..'), ['..']);
});

test('a drive after the first segment does not root the path', () => {
  assert.deepEqual(pathSegments('..\\D:\\x'), ['..', 'D:', 'x']);
});

test('a relative path resolves below the base', () => {
  assert.equal(resolvePath('D:\\repo', 'notes/x'), 'D:\\repo\\notes\\x');
});

test('a path with a drive root ignores the base', () => {
  assert.equal(resolvePath('D:\\repo', 'C:/tmp/a'), 'C:\\tmp\\a');
});

test("a path rooted without a drive takes the base's drive", () => {
  assert.equal(resolvePath('D:\\repo', '\\tmp\\a'), 'D:\\tmp\\a');
});

test('a path rooted without a drive, on a base without a drive the guard never passes, comes out relative', () => {
  assert.equal(resolvePath('\\repo\\x:y', '\\tmp\\a'), 'tmp\\a');
});

test('only a bare drive gets a separator after it', () => {
  assert.equal(resolvePath('D:\\repo', '..'), 'D:\\');
  assert.equal(resolvePath('D:\\repo', 'x:'), 'D:\\repo\\x:');
});

const samples = [
  'D:\\repo\\notes\\..\\draft.md',
  'D:/repo/./notes//a.md',
  'd:\\REPO\\',
  'C:\\..\\..\\x',
  '\\x\\..\\..\\y',
  'notes/../../a.md',
  'a/b/../../..',
  '..\\..',
  'D:\\repo\\notes::$INDEX_ALLOCATION\\x',
];

test('the segments agree with node:path win32 normalize', () => {
  for (const sample of samples) {
    assert.equal(pathSegments(sample).join('\\'), win32.normalize(sample).replace(/^\\|\\$/g, '').replace(/^\.$/, ''), sample);
  }
});

test('resolving agrees with node:path win32 resolve against an absolute base', () => {
  for (const sample of samples) {
    assert.equal(resolvePath('D:\\repo\\sub', sample), win32.resolve('D:\\repo\\sub', sample), sample);
  }
});
