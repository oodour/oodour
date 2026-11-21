import assert from 'node:assert/strict';
import { test } from 'node:test';
import { settle } from './order.ts';

test('settle takes nothing when paid, a tenth off above 100, and the total otherwise', () => {
  assert.deepEqual([settle(true, 50), settle(false, 200), settle(false, 50)], [0, 180, 50]);
});
