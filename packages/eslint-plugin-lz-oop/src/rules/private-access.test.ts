import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { ruleMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { privateAccess } from './private-access.ts';

const underscore = [{ underscore: true }] as const;
const lint = ruleMessages('private-access');

test('private-access rejects an option it does not know', () => {
  assert.throws(() => lint('', { underscore: true, prefix: '_' }), /additional properties/);
});

test('private-access reports with a message that names the smell, the member and the cure', () => {
  assert.deepEqual(lint('function settle(account) { return account._audit(); }', { underscore: true }), [
    "Stop and look: Inappropriate Intimacy, this reaches into the private member '_audit' of another object. Look " +
      'for why this code needs it. Cure: ask its class for a public message named for that need; only when none can ' +
      'exist, confine this access to one place. A test sends public messages and tests private code only while that ' +
      "code's design is unsettled, apart from the public tests; settled private code that needs tests may move into a " +
      'collaborator. No automatic change: which public message serves the need is a design decision no tool can make.',
  ]);
});

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
      name: 'a name with two leading underscores, a convention for meta fields and globals',
      code: 'function kindOf(result) { return result.__typename ?? window.__pi; }',
      options: underscore,
    },
    {
      name: 'a computed member whose key is held in an underscore variable',
      code: 'function read(record, _key) { return record[_key]; }',
      options: underscore,
    },
    {
      name: "a class expression's own static member reached through the name that holds it",
      code: 'const Terminal = class { static _handles = []; static reset() { Terminal._handles = []; } };',
      options: underscore,
    },
    {
      name: "a class's own static member reached through the class name inside that class",
      code: 'class Terminal { static _handles = []; static reset() { Terminal._handles = []; } }',
      options: underscore,
    },
    {
      name: 'the __proto__ accessor',
      code: 'function prototypeOf(account) { return account.__proto__; }',
      options: underscore,
    },
    {
      name: 'a member without an underscore read on another object',
      code: 'function settle(account) { return account.audit(); }',
      options: underscore,
    },
    {
      name: 'an underscore #private name read on another instance, which the language keeps private already',
      code: 'class Money { #_cents = 0; equals(other) { return other.#_cents; } }',
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
      name: "a class's static member reached through the class name from outside the class",
      code: 'class Emitter { static _file = null; } function track(file) { Emitter._file = file; }',
      options: underscore,
      errors: [{ messageId: 'found', data: { member: '_file' } }],
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
      name: "a private member read through a dot on another instance of the same class, as in a value object's equality",
      code: 'class Money { private cents = 0; equals(other: Money) { return this.cents === other.cents; } }',
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
      name: 'a private member read through optional brackets on a receiver that may be undefined',
      code: "class Account { private balance = 0; } function audit(account: Account | undefined) { return account?.['balance']; }",
      errors: [{ messageId: 'found', data: { member: 'balance' } }],
    },
    {
      name: 'a private member read through brackets on a union of classes that each declare it',
      code: "class Cash { private balance = 0; } class Card { private balance = 0; } function audit(source: Cash | Card) { return source['balance']; }",
      errors: [{ messageId: 'found', data: { member: 'balance' } }],
    },
    {
      name: 'a private member read through brackets on another instance of the same class',
      code: "class Money { private cents = 0; equals(other: Money) { return this.cents === other['cents']; } }",
      errors: [{ messageId: 'found', data: { member: 'cents' } }],
    },
    {
      name: 'a member read through brackets on a union in which only one class keeps it private',
      code: "class Cash { private balance = 0; } class Card { balance = 0; } function audit(source: Cash | Card) { return source['balance']; }",
      errors: [{ messageId: 'found', data: { member: 'balance' } }],
    },
    {
      name: 'a method read through brackets whose implementation is private though an overload is public',
      code: "class Account { audit(): number; private audit(full?: boolean): number { return 0; } } function run(account: Account) { return account['audit'](); }",
      errors: [{ messageId: 'found', data: { member: 'audit' } }],
    },
  ],
});
