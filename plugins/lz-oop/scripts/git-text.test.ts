import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gitText } from './git-text.ts';

const named = (...bytes: readonly number[]): string => gitText(Uint8Array.from(bytes));

test('valid UTF-8 reads as UTF-8', () => {
  assert.equal(gitText(Buffer.from('a/é€\u{1F600}', 'utf8')), 'a/é€\u{1F600}');
});

test('a surrogate written as UTF-8 reads as that lone surrogate', () => {
  assert.equal(named(0xed, 0xa0, 0x80), '\uD800');
});

test('an invalid byte from 0xA0 up reads as the character with its code', () => {
  assert.equal(named(0xe9, 0x76), 'év');
});

test('an invalid byte below 0xA0 reads as its two hex digits', () => {
  assert.equal(named(0x80, 0x9f), '809f');
});

test('a lead byte without its continuation bytes reads byte by byte', () => {
  assert.equal(named(0xc3), 'Ã');
  assert.equal(named(0xe2, 0x82), 'â' + '82');
  assert.equal(named(0xf0, 0x9f, 0x98), 'ð' + '9f98');
});

test('an over-long form reads byte by byte', () => {
  assert.equal(named(0xc0, 0x80), 'À' + '80');
  assert.equal(named(0xe0, 0x80, 0x80), 'à' + '8080');
  assert.equal(named(0xf0, 0x80, 0x80, 0x80), 'ð' + '808080');
});

test('a form above U+10FFFF reads byte by byte', () => {
  assert.equal(named(0xf4, 0x90, 0x80, 0x80), 'ô' + '908080');
  assert.equal(named(0xf5, 0x80, 0x80, 0x80), 'õ' + '808080');
});

test('the highest forms Git accepts read as one character', () => {
  assert.equal(named(0xdf, 0xbf), '߿');
  assert.equal(named(0xef, 0xbf, 0xbf), '￿');
  assert.equal(named(0xf4, 0x8f, 0xbf, 0xbf), '\u{10FFFF}');
});
