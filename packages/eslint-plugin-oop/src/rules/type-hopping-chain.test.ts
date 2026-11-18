import { testRule } from '../testing/rule-testers.ts';
import { typeHoppingChain } from './type-hopping-chain.ts';

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
    { code: `${shapes} list.filter((n) => n > 1).map((n) => n * 2).slice(0, 1);` },
    { code: `${shapes} order.customer.address.city.name;`, options: [{ maxInterfaces: 4 }] },
    { code: `${shapes} class Shop { order: Order = order; address() { return this.order.customer.address; } }` },
  ],
  invalid: [
    {
      code: `${shapes} order.customer.address.city.name;`,
      errors: [{ messageId: 'chain', data: { count: '4' } }],
    },
  ],
});
