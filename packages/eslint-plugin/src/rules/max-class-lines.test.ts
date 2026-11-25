import { testRule } from '../testing/rule-testers.ts';
import { maxClassLines } from './max-class-lines.ts';

// A class of `count` lines: its two brace lines and one field per line between them.
const classOf = (count: number): string =>
  `class Invoice {\n${Array.from({ length: count - 2 }, (_, index) => `  field${String(index)} = 0;\n`).join('')}}`;

testRule(maxClassLines, {
  valid: [
    classOf(110),
    { code: 'class Invoice {\n\n  total = 0;\n  \n}', options: [{ max: 3 }] },
    { code: 'class Invoice {\n  // In cents.\n  /*\n   * Never negative.\n   */\n  total = 0; // set once\n}', options: [{ max: 3 }] },
  ],
  invalid: [
    { code: classOf(111), errors: [{ messageId: 'found', data: { name: "Class 'Invoice'", lineCount: 111, max: 110 } }] },
    {
      code: 'class Invoice {\n  total = 0;\n}',
      options: [{ max: 2 }],
      errors: [{ messageId: 'found', data: { name: "Class 'Invoice'", lineCount: 3, max: 2 } }],
    },
    {
      code: 'class Invoice {\n\n  total = 0;\n  \n}',
      options: [{ max: 3, skipBlankLines: false }],
      errors: [{ messageId: 'found', data: { name: "Class 'Invoice'", lineCount: 5, max: 3 } }],
    },
    {
      code: 'class Invoice {\n  // In cents.\n  /*\n\n   */\n  total = 0;\n}',
      options: [{ max: 3, skipComments: false }],
      errors: [{ messageId: 'found', data: { name: "Class 'Invoice'", lineCount: 7, max: 3 } }],
    },
    {
      code: 'export default class {\n  total = 0;\n}\nconst Order = class {\n  total = 0;\n};',
      options: [{ max: 2 }],
      errors: [
        { messageId: 'found', data: { name: 'An anonymous class', lineCount: 3, max: 2 } },
        { messageId: 'found', data: { name: 'An anonymous class', lineCount: 3, max: 2 } },
      ],
    },
  ],
});
