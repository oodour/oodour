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
  ],
  invalid: [
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
