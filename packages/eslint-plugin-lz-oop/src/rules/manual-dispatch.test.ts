import { testRule } from '../testing/rule-testers.ts';
import { manualDispatch } from './manual-dispatch.ts';

testRule(manualDispatch, {
  valid: [
    {
      name: 'one class test',
      code: 'function area(shape) { if (shape instanceof Circle) { return shape.r; } return 0; }',
    },
    {
      name: 'a chain that tests different objects',
      code: 'function f(a, b) { if (a instanceof Circle) { return 1; } else if (b instanceof Square) { return 2; } }',
    },
    {
      name: 'a chain that tells built-in values apart',
      code: `
        function serialize(value) {
          if (value instanceof Date) { return value.toISOString(); } else if (value instanceof RegExp) { return value.source; } else if (value instanceof Map) { return [...value]; }
          return value;
        }
      `,
    },
    {
      name: 'a chain that narrows a caught error',
      code: `
        try { run(); } catch (error) {
          if (error instanceof SyntaxError) { report(1); } else if (error instanceof NetworkError) { report(2); }
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'an if chain that tests one object against two classes',
      code: `
        function area(shape) {
          if (shape instanceof Circle) {
            return 3.14 * shape.r * shape.r;
          } else if (shape instanceof Square) {
            return shape.side * shape.side;
          }
        }
      `,
      errors: [{ messageId: 'found', line: 3, data: { subject: 'shape' } }],
    },
    {
      name: 'a chain on a field that also tests other things',
      code: `
        class Drawing {
          area() {
            if (this.shape === undefined) { return 0; } else if (this.shape instanceof Circle) { return 1; } else if (this.shape instanceof Square) { return 2; }
          }
        }
      `,
      errors: [{ messageId: 'found', line: 4, data: { subject: 'this.shape' } }],
    },
  ],
});
