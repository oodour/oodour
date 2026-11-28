import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presetMessages } from '../testing/rule-messages.ts';
import { testRule } from '../testing/rule-testers.ts';
import { manualDispatch } from './manual-dispatch.ts';

test('the strict preset reports manual dispatch with a message that names the smell, the subject and the cure', () => {
  const messages = presetMessages(
    'strict',
    'manual-dispatch',
    'function area(shape) { if (shape instanceof Circle) { return 1; } else if (shape instanceof Square) { return 2; } return 0; }',
    'area.ts',
  );

  assert.deepEqual(messages, [
    "Stop and look: Manual Dispatch, this chain tests which class 'shape' is to decide what to do. Look for what this " +
      'code needs from every object it tests. Cure: define the duck type, one message every one of these classes ' +
      'answers, so the code sends it without asking. No automatic change: the message every class should answer is a ' +
      'design decision no tool can make.',
  ]);
});

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
    {
      name: 'a chain that compares one object with values rather than testing its class',
      code: 'function label(shape) { if (shape === circle) { return 1; } else if (shape === square) { return 2; } }',
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
      errors: [
        { messageId: 'found', line: 4, data: { subject: 'this.shape' } },
      ],
    },
    {
      name: 'a chain that is the unbraced body of another if',
      code: 'function area(shape, ready) { if (ready) if (shape instanceof Circle) { return 1; } else if (shape instanceof Square) { return 2; } }',
      errors: [{ messageId: 'found', column: 42, data: { subject: 'shape' } }],
    },
  ],
});
