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
  'new-in-constructor': {
    valid: [
      "class Port { constructor(n) { if (n < 0) { throw new PortRangeError('negative'); } this.n = n; } }",
      'class Tally { constructor() { this.counts = new Map(); } }',
      "class Checkout { constructor(gateway = new CardGateway('live')) { this.gateway = gateway; } }",
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
  'ts-private': {
    valid: [
      'class CartPage { private readonly cart = inject(CartService); }',
      'class CartApi { constructor(private readonly http: HttpClient) {} }',
      'class Money { private constructor(readonly cents: number) {} static of(cents: number) { return new Money(cents); } }',
    ],
    invalid: [
      {
        code: 'class Cart { private total = 0; add(n: number) { this.total += n; return this.total; } }',
        errors: [
          {
            messageId: 'found',
            suggestions: [
              {
                messageId: 'suggestion',
                output: 'class Cart { #total = 0; add(n: number) { this.#total += n; return this.#total; } }',
              },
            ],
          },
        ],
      },
      {
        code: 'class Cart { private recount() { return 0; } refresh() { return this.recount(); } }',
        errors: [
          {
            messageId: 'found',
            suggestions: [
              { messageId: 'suggestion', output: 'class Cart { #recount() { return 0; } refresh() { return this.#recount(); } }' },
            ],
          },
        ],
      },
      {
        code: "class Field { @Input() private label = ''; }",
        errors: [{ messageId: 'found', suggestions: [] }],
      },
      {
        code: "class Form { private label = ''; read(key: 'label') { return this[key]; } }",
        errors: [{ messageId: 'found', suggestions: [] }],
      },
      {
        code: 'class Money { private cents = 0; equals(other: Money) { return this.cents === other.cents; } }',
        errors: [{ messageId: 'found', suggestions: [] }],
      },
      {
        code: 'class Ids { private static next = 0; static take() { return Ids.next++; } }',
        errors: [{ messageId: 'found', suggestions: [] }],
      },
      {
        code: 'class Gauge { #level = 0; private level = 1; }',
        errors: [{ messageId: 'found', suggestions: [] }],
      },
      {
        code: 'class Order { private readonly lines: string[] = []; count() { return this.lines.length; } }',
        errors: [
          {
            messageId: 'found',
            suggestions: [
              {
                messageId: 'suggestion',
                output: 'class Order { readonly #lines: string[] = []; count() { return this.#lines.length; } }',
              },
            ],
          },
        ],
      },
      {
        code: 'class Gauge { private get level() { return 1; } private set level(value: number) {} }',
        errors: [
          { messageId: 'found', suggestions: [] },
          { messageId: 'found', suggestions: [] },
        ],
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
