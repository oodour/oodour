import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';
import { sizeRemedy } from '../wrap-rule.ts';

/** Every line a token or comment spans, so a multi-line template literal or block comment counts on each line. */
function linesOf({ loc }: { readonly loc: TSESTree.SourceLocation }): number[] {
  return Array.from({ length: loc.end.line - loc.start.line + 1 }, (_, offset) => loc.start.line + offset);
}

// The option names and meanings of core `max-lines`, at the 110 lines Lars ruled for JavaScript and TypeScript classes.
const defaults = { max: 110, skipBlankLines: true, skipComments: true };

type Options = [Partial<typeof defaults>];

export const maxClassLines = createRule<Options, 'found'>({
  name: 'max-class-lines',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a class with more lines than allowed, not counting blank lines and comments',
      concept: 'Large Class',
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
  create(context, [options]) {
    // `createRule` has merged the defaults in already; this spread only gives the type checker the same knowledge.
    const { max, skipBlankLines, skipComments } = { ...defaults, ...options };
    const { sourceCode } = context;

    return {
      'ClassDeclaration, ClassExpression'(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) {
        const codeLines = new Set(sourceCode.getTokens(node).flatMap(linesOf));
        const commentLines = new Set(sourceCode.getCommentsInside(node).flatMap(linesOf));
        const counts = (text: string, line: number): boolean => {
          if (codeLines.has(line)) {
            return true;
          }

          return commentLines.has(line) ? !skipComments : !skipBlankLines && text.trim() === '';
        };
        const lineCount = sourceCode.lines
          .slice(node.loc.start.line - 1, node.loc.end.line)
          .filter((text, index) => counts(text, node.loc.start.line + index)).length;

        if (lineCount > max) {
          context.report({
            node,
            messageId: 'found',
            data: { name: node.id === null ? 'An anonymous class' : `Class '${node.id.name}'`, lineCount, max },
          });
        }
      },
    };
  },
});
