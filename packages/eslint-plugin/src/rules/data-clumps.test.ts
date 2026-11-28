import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presetMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { dataClumps } from './data-clumps.ts';

test('the strict preset reports a data clump with a message that names the smell, the clump and the cures', () => {
  const messages = presetMessages(
    'strict',
    'data-clumps',
    'export function book(start, end) {}\nexport function free(start, end) {}\nexport function span(start, end) {}\n',
    'schedule.ts',
  );

  assert.deepEqual(messages, [
    'Stop and look: Data Clumps, the parameters end, start travel together through 3 functions here. Look for the ' +
      'object they describe. Cure: Introduce Parameter Object, one object for them and the behaviour that uses them; ' +
      'or Preserve Whole Object where a caller already holds an object that carries them. No automatic change: which ' +
      'object the parameters become is a design decision no tool can make.',
  ]);
});

testRule(dataClumps, {
  valid: [
    {
      name: 'three methods of two parameters each that share only one of them',
      code: 'class Schedule { book(start, end) { return end; } free(start, room) { return room; } span(start, size) { return size; } }',
    },
    {
      name: 'two parameters taken by only two methods',
      code: 'class Schedule { book(start, end) { return [start, end]; } free(start, end) { return [start, end]; } }',
    },
    {
      name: 'three methods that share only one parameter',
      code: 'class Schedule { book(start, end) { return end; } free(start, room) { return room; } span(start) { return start; } }',
    },
    {
      name: 'the overload signatures of one method',
      code: `
        class Schedule {
          book(start: number, end: number): void;
          book(start: string, end: string): void;
          book(start: unknown, end: unknown): void { console.log(start, end); }
        }
      `,
    },
    {
      name: 'a TypeScript this parameter, which declares the receiver and is not passed',
      code: `
        function book(this: Window, start: number) { return start; }
        function free(this: Window, start: number) { return start; }
        function span(this: Window, start: number) { return start; }
      `,
    },
  ],
  invalid: [
    {
      name: 'two clumps that share a name, where the larger does not hold the smaller',
      code: `
        function f1(a, b) {}
        function f2(a, b) {}
        function f3(a, b) {}
        function g1(a, c, d) {}
        function g2(a, c, d) {}
        function g3(a, c, d) {}
      `,
      errors: [
        { messageId: 'found', data: { clump: 'a, b', count: 3 }, line: 2 },
        { messageId: 'found', data: { clump: 'a, c, d', count: 3 }, line: 5 },
      ],
    },
    {
      name: 'a clump that a default-exported function shares with two others of its module',
      code: `
        export default function line(x, y) { return [x, y]; }
        function area(x, y) { return x * y; }
        export const dots = (x, y) => x + y;
      `,
      errors: [
        { messageId: 'found', data: { clump: 'x, y', count: 3 }, line: 2 },
      ],
    },
    {
      name: 'a clump that class-field functions share with a method',
      code: `
        class Plot {
          line = (x, y) => [x, y];
          area = function (x, y) { return x * y; };
          dots(x, y) { return x + y; }
          label = 'plot';
          count;
        }
      `,
      errors: [
        { messageId: 'found', data: { clump: 'x, y', count: 3 }, line: 3 },
      ],
    },
    {
      name: 'a clump that only all three methods share, each pair sharing one more name',
      code: `
        class Plot {
          line(x, y, a, b) { return [x, y, a, b]; }
          area(x, y, a, c) { return [x, y, a, c]; }
          dots(x, y, b, c) { return [x, y, b, c]; }
        }
      `,
      errors: [
        { messageId: 'found', data: { clump: 'x, y', count: 3 }, line: 3 },
      ],
    },
    {
      name: 'a clump and a smaller clump inside it, reported once as the larger',
      code: `
        class Space {
          move(x, y, z) { return [x, y, z]; }
          scale(x, y, z) { return [x, y, z]; }
          turn(x, y, z) { return [x, y, z]; }
          flat(x, y) { return [x, y]; }
        }
      `,
      errors: [
        { messageId: 'found', data: { clump: 'x, y, z', count: 3 }, line: 3 },
      ],
    },
    {
      name: 'two parameters taken by three methods of one class',
      code: `
        class Schedule {
          book(start, end) { return [start, end]; }
          free(start, end) { return [start, end]; }
          span(start, end) { return end - start; }
        }
      `,
      errors: [
        {
          messageId: 'found',
          data: { clump: 'end, start', count: 3 },
          line: 3,
        },
      ],
    },
    {
      name: 'the clump in three of four methods',
      code: `
        class Schedule {
          book(start, end) { return [start, end]; }
          title() { return 'week'; }
          free(end, start) { return [start, end]; }
          span(start, end) { return end - start; }
        }
      `,
      errors: [
        {
          messageId: 'found',
          data: { clump: 'end, start', count: 3 },
          line: 3,
        },
      ],
    },
    {
      name: 'a clump member with a default value',
      code: `
        class Schedule {
          book(start, end) { return [start, end]; }
          free(start, end) { return [start, end]; }
          span(start, end = start + 1) { return end - start; }
        }
      `,
      errors: [{ messageId: 'found', data: { clump: 'end, start', count: 3 } }],
    },
    {
      name: 'two parameters taken by three functions of one module',
      code: `
        export function book(start, end) { return [start, end]; }
        export function free(start, end) { return [start, end]; }
        export const span = (start, end) => end - start;
      `,
      errors: [
        {
          messageId: 'found',
          data: { clump: 'end, start', count: 3 },
          line: 2,
        },
      ],
    },
    {
      name: 'two parameters taken by three functions of one module, one of them a function expression',
      code: `
        export function book(start, end) { return [start, end]; }
        export function free(start, end) { return [start, end]; }
        export const span = function (start, end) { return end - start; };
      `,
      errors: [
        {
          messageId: 'found',
          data: { clump: 'end, start', count: 3 },
          line: 2,
        },
      ],
    },
    {
      name: 'two clumps that share a name, neither inside the other',
      code: `
        class Grid {
          a1(a, b) {} a2(a, b) {} a3(a, b) {}
          c1(b, c, d) {} c2(b, c, d) {} c3(b, c, d) {}
        }
      `,
      errors: [
        { messageId: 'found', data: { clump: 'a, b', count: 3 }, line: 3 },
        { messageId: 'found', data: { clump: 'b, c, d', count: 3 }, line: 4 },
      ],
    },
    {
      name: 'two clumps whose names would run together into the same text',
      code: `
        class Codes {
          f1(ab, c) {} f2(ab, c) {} f3(ab, c) {}
          g1(a, bc) {} g2(a, bc) {} g3(a, bc) {}
        }
      `,
      errors: [
        { messageId: 'found', data: { clump: 'ab, c', count: 3 }, line: 3 },
        { messageId: 'found', data: { clump: 'a, bc', count: 3 }, line: 4 },
      ],
    },
    {
      name: 'two clumps that start at the same method, in the order of the methods that first share them',
      code: `
        class Shapes {
          base(a, b, c, d, e) {}
          wide(a, b, e, p) {}
          tall(c, d, r) {}
          deep(a, b, q) {}
          flat(c, d, s) {}
        }
      `,
      errors: [
        { messageId: 'found', data: { clump: 'a, b', count: 3 }, line: 3 },
        { messageId: 'found', data: { clump: 'c, d', count: 3 }, line: 3 },
      ],
    },
  ],
});
