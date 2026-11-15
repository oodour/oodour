import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aimedAtStore, keep, listsStore, shellOutput, storeLine } from '../hooks/scrub.ts';

test('a line that starts with a store path is a store line, in every listing shape', () => {
  for (const line of [
    '.oracle/metz-talks/x.md',
    '.oracle\\metz-talks\\x.md',
    './.oracle/99-bottles-2e-js/index.md',
    './.oracle/99-bottles-2e-js:',
    'D:/repo/.oracle/a.md',
    'D:\\repo\\.oracle\\a.md',
    '.oracle/metz-talks/x.md:3:text',
    '    Directory: D:\\repo\\.oracle\\metz-talks',
    '.ORACLE/x.md',
  ]) {
    assert.ok(storeLine.test(line), line);
    assert.equal(keep(line), false, line);
  }
});

test('a line that only mentions the store, or names the folder alone, is kept', () => {
  for (const line of [
    'AGENTS.md:12:keep out of .oracle/ entirely',
    'tools/x.ts: the .oracle/ store',
    '`.oracle/` holds the full text',
    '.oracle',
    'src/oracle/x.md',
    'my.oracle/x.md',
    '',
  ]) {
    assert.ok(keep(line), line);
  }
});

test('shell output lists the store when any line is a store line', () => {
  assert.ok(listsStore('./AGENTS.md\n./.oracle/x.md'));
  assert.ok(listsStore('AGENTS.md\r\n./.oracle/x.md'));
  assert.equal(listsStore('.gitignore\n.oracle\nAGENTS.md'), false);
});

test('shell output lists the store when a JSON line carries a store path', () => {
  assert.ok(listsStore('{"type":"begin","data":{"path":{"text":".oracle\\\\x\\\\a.md"}}}'));
});

test('shell output lists the store when a path inside it sits anywhere in a line', () => {
  assert.ok(listsStore(' Directory of D:\\repo\\.oracle\\metz-talks\n\n01/01/2026  x.md'));
  assert.ok(listsStore('match in "D:/repo/.oracle/x/a.md" at 3'));
  assert.ok(listsStore('C:\\Users\\Some User\\repo\\.oracle\\x.md:3:text'));
});

test('shell output that mentions the store in prose does not list it', () => {
  assert.equal(listsStore('AGENTS.md:12:keep out of .oracle/ entirely\n`.oracle/` holds the full text\nrepo\\x.oracle\\a.md'), false);
});

test('shell output joins the text with stdout and stderr, and ignores a result that is not an object', () => {
  assert.equal(shellOutput('t', { stdout: 'o', stderr: 'e' }), 't\no\ne');
  assert.equal(shellOutput(undefined, { stdout: 7 }), '\n\n');
  assert.equal(shellOutput('t', null), 't\n\n');
  assert.equal(shellOutput('t', 'raw'), 't\n\n');
});

test('a call is aimed at the store when any of its string fields names it', () => {
  assert.ok(aimedAtStore([undefined, '.oracle/metz-talks']));
  assert.ok(aimedAtStore(['cat ".oracle/x"']));
  assert.equal(aimedAtStore(['**/*.md', undefined, 7]), false);
  assert.equal(aimedAtStore(['my.oracle/x']), false);
});
