import assert from 'node:assert/strict';
import { test } from 'node:test';
import { settle, Till } from './order.ts';

test('settle takes nothing when paid, a tenth off above 100, and the total otherwise', () => {
  assert.deepEqual([settle(true, 50), settle(false, 200), settle(false, 50)], [0, 180, 50]);
});

test('a till charges a positive amount', () => {
  assert.equal(new Till().charge(5), 5);
});
