import { expect, test } from 'vitest';
import { settle } from './order.ts';

test('settle takes nothing when paid, a tenth off above 100, and the total otherwise', () => {
  expect([settle(true, 50), settle(false, 200), settle(false, 50)]).toEqual([0, 180, 50]);
});
