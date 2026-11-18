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

// `testRule` picks the typed tester because the rule declares `requiresTypeChecking: true`, and names the suite
// after `rule.name`. A rule with remedy `fix` needs `output` on each invalid case and one with `suggestion` needs
// `suggestions` on each error: RuleTester fails the case otherwise.
testRule(typeHoppingChain, {
  valid: [
    { code: `${shapes} list.filter((n) => n > 1).map((n) => n * 2).slice(0, 1);` },
    { code: `${shapes} order.customer;` },
    { code: `${shapes} order.customer.address.city.name;`, options: [{ maxInterfaces: 4 }] },
  ],
  invalid: [
    {
      code: `${shapes} order.customer.address.city.name;`,
      errors: [{ messageId: 'chain', data: { count: '4' } }],
    },
  ],
});
