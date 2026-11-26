import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { measure, parseSource, typeHoppingChain } from '../index.ts';

describe('typeHoppingChain', () => {
  it('has nothing to report without the types of a program', () => {
    const source = parseSource('order.customer.address.city;', 'file.ts');

    assert.ok(!('parseError' in source));
    assert.deepEqual(measure(source, [typeHoppingChain]).of(typeHoppingChain), []);
  });

  it('goes by its name', () => {
    assert.equal(typeHoppingChain.name, 'type-hopping-chain');
  });
});
