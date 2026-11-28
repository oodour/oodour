import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { maxClassLines } from './max-class-lines.ts';

const lint = ruleMessages('max-class-lines');

test('max-class-lines rejects an option it does not know', () => {
  assert.throws(() => lint('', { max: 4, limit: 4 }), /additional properties/);
});

test('max-class-lines accepts a limit of zero and rejects a negative one', () => {
  assert.equal(lint('class A {}', { max: 0 }).length, 1);
  assert.throws(() => lint('', { max: -1 }), /should be >= 0/);
});

test('max-class-lines says which lines it leaves out', () => {
  assert.match(
    lint('class A {}', { max: 0 })[0] ?? '',
    /brings in from another module are not counted\. No automatic change/,
  );
});

// A class of `count` lines: its two brace lines and one field per line between them.
const classOf = (count: number): string =>
  `class Invoice {\n${Array.from({ length: count - 2 }, (_, index) => `  field${String(index)} = 0;\n`).join('')}}`;

testRule(maxClassLines, {
  valid: [
    classOf(110),
    { code: 'class Invoice {\n\n  total = 0;\n  \n}', options: [{ max: 3 }] },
    {
      code: 'class Invoice {\n  // In cents.\n  /*\n   * Never negative.\n   */\n  total = 0; // set once\n}',
      options: [{ max: 3 }],
    },
  ],
  invalid: [
    {
      code: classOf(111),
      errors: [
        {
          messageId: 'found',
          data: { name: "Class 'Invoice'", lineCount: 111, max: 110 },
        },
      ],
    },
    {
      code: 'class Invoice {\n  total = 0;\n}',
      options: [{ max: 2 }],
      errors: [
        {
          messageId: 'found',
          data: { name: "Class 'Invoice'", lineCount: 3, max: 2 },
        },
      ],
    },
    {
      code: 'class Invoice {\n\n  total = 0;\n  \n}',
      options: [{ max: 3, skipBlankLines: false }],
      errors: [
        {
          messageId: 'found',
          data: { name: "Class 'Invoice'", lineCount: 5, max: 3 },
        },
      ],
    },
    {
      code: 'class Invoice {\n  // In cents.\n  /*\n\n   */\n  total = 0;\n}',
      options: [{ max: 3, skipComments: false }],
      errors: [
        {
          messageId: 'found',
          data: { name: "Class 'Invoice'", lineCount: 7, max: 3 },
        },
      ],
    },
    {
      code: 'export default class {\n  total = 0;\n}\nconst Order = class {\n  total = 0;\n};',
      options: [{ max: 2 }],
      errors: [
        {
          messageId: 'found',
          data: { name: 'An anonymous class', lineCount: 3, max: 2 },
        },
        {
          messageId: 'found',
          data: { name: 'An anonymous class', lineCount: 3, max: 2 },
        },
      ],
    },
  ],
});
