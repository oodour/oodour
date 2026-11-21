import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crapScore, reportsAtLimit } from './crap.ts';

test('a function with one path that every test run covers scores its complexity', () => {
  assert.equal(crapScore({ complexity: 1, coverage: 1 }), 1);
});

test('a fully covered function scores its complexity, whatever that is', () => {
  assert.equal(crapScore({ complexity: 7, coverage: 1 }), 7);
});

test('an uncovered function adds the square of its complexity', () => {
  assert.equal(crapScore({ complexity: 5, coverage: 0 }), 30);
});

test('a function whose score reaches the limit is reported, as Fallow reports it, and one below it is not', () => {
  const signals = { called: true, publicMethod: false, untestedBranches: 0 };
  const atLimit = { file: 'a.ts', line: 1, name: 'settle', complexity: 5, coverage: 0, ...signals };
  const below = { file: 'a.ts', line: 9, name: 'total', complexity: 5, coverage: 0.1, ...signals };

  assert.deepEqual(reportsAtLimit([atLimit, below], 30), [{ ...atLimit, score: 30 }]);
});

test('a half-covered function adds an eighth of the square, since the uncovered part is cubed', () => {
  assert.equal(crapScore({ complexity: 4, coverage: 0.5 }), 6);
});
