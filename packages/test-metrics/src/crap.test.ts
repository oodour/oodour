import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crapScore } from './crap.ts';

test('a function with one path that every test run covers scores its complexity', () => {
  assert.equal(crapScore({ complexity: 1, coverage: 1 }), 1);
});

test('a fully covered function scores its complexity, whatever that is', () => {
  assert.equal(crapScore({ complexity: 7, coverage: 1 }), 7);
});

test('an uncovered function adds the square of its complexity', () => {
  assert.equal(crapScore({ complexity: 5, coverage: 0 }), 30);
});

test('a half-covered function adds an eighth of the square, since the uncovered part is cubed', () => {
  assert.equal(crapScore({ complexity: 4, coverage: 0.5 }), 6);
});
