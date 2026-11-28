import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { typeHoppingChain } from './type-hopping-chain.ts';

const lint = ruleMessages('type-hopping-chain');

test('type-hopping-chain rejects an option it does not know and a limit below one', () => {
  assert.throws(
    () => lint('', { maxInterfaces: 2, limit: 2 }),
    /additional properties/,
  );
  assert.throws(() => lint('', { maxInterfaces: 0 }), /should be >= 1/);
});

test('type-hopping-chain says why it changes nothing itself and what the cure is named for', () => {
  assert.match(
    typeHoppingChain.meta.messages.chain,
    /a method on the nearest object named for that goal\. No automatic change: the cure adds .* a codemod for it is planned\.$/,
  );
});

const shapes = `
interface City { name: string }
interface Address { city: City }
interface Customer { address: Address }
interface Order { customer: Customer }
declare const order: Order;
declare const list: number[];
`;

testRule(typeHoppingChain, {
  valid: [
    { code: `${shapes} order.customer;` },
    { code: `${shapes} order.customer;`, options: [{ maxInterfaces: 1 }] },
    {
      code: `${shapes} list.filter((n) => n > 1).map((n) => n * 2).slice(0, 1);`,
    },
    {
      code: `${shapes} order.customer.address.city.name;`,
      options: [{ maxInterfaces: 4 }],
    },
    {
      code: `${shapes} class Shop { order: Order = order; address() { return this.order.customer.address; } }`,
    },
  ],
  invalid: [
    {
      code: `${shapes} order.customer.address.city.name;`,
      errors: [{ messageId: 'chain', data: { count: '4' } }],
    },
  ],
});
