import { type ClassLines, classLines } from '@oodour/core';
import { defineMetricRule } from '../define-metric-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

// The option names and meanings of core `max-lines`, at the 110 lines Lars ruled for JavaScript and TypeScript classes.
const defaults = { max: 110, skipBlankLines: true, skipComments: true };

type Options = [Partial<typeof defaults>];

export const maxClassLines = defineMetricRule<Options, 'found', ClassLines, 'class'>({
  name: 'max-class-lines',
  metric: classLines,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a class with more lines than allowed, not counting blank lines and comments',
      concept: 'Large Class',
      cures: ['Extract Class'],
      requiresTypeChecking: false,
      remedy: sizeRemedy,
      tier: 'strict',
    },
    messages: {
      found:
        'Stop and look: Large Class, {{name}} has {{lineCount}} lines of code (at most {{max}}). Look for groups of ' +
        'fields and methods that serve different jobs. Cure: Extract Class for each group. Lines a mixin or base class ' +
        'brings in from another module are not counted.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 0 },
          skipBlankLines: { type: 'boolean' },
          skipComments: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [defaults],
  },
  check({ unit, value: { code, comments, blank } }, context, [options]) {
    // `createRule` has merged the defaults in already; this spread only gives the type checker the same knowledge.
    const { max, skipBlankLines, skipComments } = { ...defaults, ...options };
    const lineCount = code + (skipComments ? 0 : comments) + (skipBlankLines ? 0 : blank);

    if (lineCount > max) {
      context.report({
        node: unit.node,
        messageId: 'found',
        data: { name: unit.node.id === null ? 'An anonymous class' : `Class '${unit.node.id.name}'`, lineCount, max },
      });
    }
  },
});
