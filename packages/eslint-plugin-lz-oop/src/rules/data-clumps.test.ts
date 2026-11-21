import { testRule } from '../testing/rule-testers.ts';
import { dataClumps } from './data-clumps.ts';

testRule(dataClumps, {
  valid: [
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
      name: 'a clump that only all three methods share, each pair sharing one more name',
      code: `
        class Plot {
          line(x, y, a, b) { return [x, y, a, b]; }
          area(x, y, a, c) { return [x, y, a, c]; }
          dots(x, y, b, c) { return [x, y, b, c]; }
        }
      `,
      errors: [{ messageId: 'found', data: { clump: 'x, y', count: 3 }, line: 3 }],
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
      errors: [{ messageId: 'found', data: { clump: 'x, y, z', count: 3 }, line: 3 }],
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
      errors: [{ messageId: 'found', data: { clump: 'end, start', count: 3 }, line: 3 }],
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
      errors: [{ messageId: 'found', data: { clump: 'end, start', count: 3 }, line: 3 }],
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
      errors: [{ messageId: 'found', data: { clump: 'end, start', count: 3 }, line: 2 }],
    },
  ],
});
