import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RunTests } from '@typescript-eslint/rule-tester';
import type { SelectorMessageId } from '../define-selector-rule.ts';
import { testRule } from '../testing/rule-testers.ts';
import { selectorRules, type SelectorRuleName } from './selector-rules.ts';

// Valid cases hold the false positives the measurements recorded and the sharpened selector avoids; invalid cases are
// true positives of the same shape, written for these tests.
const selectorCases = {
  'switch-on-kind': {
    valid: [
      "switch (order.status) { case 'open': break; }",
      "switch (kind) { case 'letter': break; }",
    ],
    invalid: [
      {
        code: `
          function postage(parcel) {
            switch (parcel.kind) {
              case 'letter':
                return 1.5 + parcel.grams * 0.01;
              case 'crate':
                return parcel.kilos * 4 + parcel.floors * 12;
            }
          }
        `,
        errors: [{ messageId: 'found' }],
      },
    ],
  },
  'module-let': {
    valid: [
      'const limit = 3;',
      'export function total(items) { let sum = 0; items.forEach((item) => { sum += item; }); return sum; }',
    ],
    invalid: [
      {
        code: `
          let activeSession;
          export function begin(session) { activeSession = session; }
          export function current() { return activeSession; }
        `,
        errors: [{ messageId: 'found' }],
      },
    ],
  },
  'new-collaborator': {
    valid: [
      "class Port { constructor(n) { if (n < 0) { throw new PortRangeError('negative'); } this.n = n; } }",
      'class Tally { constructor() { this.counts = new Map(); } }',
      "class Checkout { constructor(gateway = new CardGateway('live')) { this.gateway = gateway; } }",
      'class Shapes { circle(radius) { return new Circle(radius); } }',
      'class Invoice { lines() { return this.items.map((item) => new Line(item)); } }',
      'class Money { static parse(text) { const money = new Money(Number(text)); money.check(); return money; } }',
      'class Tally { #counts = new Map(); }',
      "class Checkout { pay(gateway = new CardGateway('live')) { return gateway.charge(this.total); } }",
      'class Panel { render() { this.container.addChild(new Spacer(1)); } }',
      "class Profile { name = new FormControl(''); saved = new EventEmitter(); changes = new BehaviorSubject(null); }",
      "class Upload { send(file) { const body = new FormData(); body.append('file', file); return this.http.post(body); } }",
    ],
    invalid: [
      {
        code: `
          class Checkout {
            constructor(cart) {
              this.cart = cart;
              this.gateway = new CardGateway('live');
            }
          }
        `,
        errors: [{ messageId: 'found' }],
      },
      {
        code: 'class Store { constructor(options) { this.guard = options.guard ?? new ActionGuard(options); } }',
        errors: [{ messageId: 'found' }],
      },
      {
        code: 'class Report { print() { const printer = new Printer(); printer.send(this.lines); } }',
        errors: [{ messageId: 'found' }],
      },
      {
        code: 'class App { start() { this.screen = new Screen(new Terminal()); } }',
        errors: [{ messageId: 'found' }],
      },
      {
        code: "class Checkout { gateway = new CardGateway('live'); }",
        errors: [{ messageId: 'found' }],
      },
      {
        code: "class Checkout { gateway() { return (this.cached ??= new CardGateway('live')); } }",
        errors: [{ messageId: 'found' }],
      },
    ],
  },
  'optional-collaborator': {
    valid: [
      'class Dialog { title() { return this.data.title; } }',
      'function title(dialog) { return dialog.data?.title; }',
      'class Dialog { close() { this.onClose?.(); } }',
    ],
    invalid: [
      {
        code: `
          class Dialog {
            title() { return this.data?.title ?? 'Untitled'; }
          }
        `,
        errors: [{ messageId: 'found' }],
      },
    ],
  },
  'optional-private-field': {
    valid: ['class Badge { @Input() caption?: string; }', 'class ServerOptions { port?: number; host?: string; }'],
    invalid: [
      {
        code: `
          class Importer {
            #batch?: Batch;
            start(source: Source) { this.#batch = source.open(); }
            next() { return this.#batch?.read(); }
          }
        `,
        errors: [{ messageId: 'found' }],
      },
    ],
  },
} satisfies Record<SelectorRuleName, RunTests<SelectorMessageId, []>>;

Object.entries(selectorCases).forEach(([name, cases]) => {
  const rule = selectorRules.find((candidate) => candidate.name === name);

  if (rule === undefined) {
    test(name, () => {
      assert.fail(`no selector row is named ${name}`);
    });

    return;
  }

  testRule(rule, cases);
});
