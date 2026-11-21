import { join } from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { testRule } from '../testing/rule-testers.ts';
import { privateAccess } from './private-access.ts';

const underscore = [{ underscore: true }] as const;

testRule(privateAccess, {
  valid: [
    {
      name: 'an underscore member read on this',
      code: 'class Account { _audit() { return this._balance; } }',
      options: underscore,
    },
    {
      name: 'an underscore member read on another object, with the underscore form off by default',
      code: 'function settle(account) { return account._audit(); }',
    },
    {
      name: 'an underscore member read on super',
      code: 'class Savings extends Account { _audit() { return super._audit(); } }',
      options: underscore,
    },
    {
      name: 'the __proto__ accessor',
      code: 'function prototypeOf(account) { return account.__proto__; }',
      options: underscore,
    },
  ],
  invalid: [
    {
      name: 'an underscore member read on another object',
      code: 'function settle(account) { return account._audit(); }',
      options: underscore,
      errors: [{ messageId: 'found', data: { member: '_audit' } }],
    },
    {
      name: 'an underscore member read on another instance of the same class',
      code: 'class Money { equals(other) { return this._cents === other._cents; } }',
      options: underscore,
      errors: [{ messageId: 'found', data: { member: '_cents' } }],
    },
  ],
});

new RuleTester({
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: join(import.meta.dirname, '..', '..', 'tests', 'typed-fixture') },
  },
}).run('private-access with type information', privateAccess, {
  valid: [
    {
      name: 'a private member read through brackets on this',
      code: "class Account { private balance = 0; audit() { return this['balance']; } }",
    },
    {
      name: 'a public member read through brackets on another object',
      code: "class Account { balance = 0; } function audit(account: Account) { return account['balance']; }",
    },
  ],
  invalid: [
    {
      name: 'a private member read through brackets on another object',
      code: "class Account { private balance = 0; } function audit(account: Account) { return account['balance']; }",
      errors: [{ messageId: 'found', data: { member: 'balance' } }],
    },
    {
      name: 'a protected member read through brackets on another object',
      code: "class Account { protected audit() { return 0; } } function run(account: Account) { return account['audit'](); }",
      errors: [{ messageId: 'found', data: { member: 'audit' } }],
    },
    {
      name: 'a private member read through brackets on another instance of the same class',
      code: "class Money { private cents = 0; equals(other: Money) { return this.cents === other['cents']; } }",
      errors: [{ messageId: 'found', data: { member: 'cents' } }],
    },
  ],
});
