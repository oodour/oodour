import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { defineMetric } from '../metric.ts';
import type { Source } from '../source.ts';

/** How a class's lines split: a line with a token is code, one with only a comment is a comment, the rest are blank. */
export interface ClassLines {
  readonly code: number;
  readonly comments: number;
  readonly blank: number;
}

/**
 * The lines of each class, as the `max-lines` options of ESLint count lines: a multi-line token counts on each line.
 * A class's first and last lines hold its own tokens, so a token or comment outside it never decides a line's kind,
 * and a line inside it without either holds only white space.
 */
export const classLines = defineMetric({
  name: 'class-lines',
  needs: 'syntax',
  units: ['class'],
  open: () => undefined,
  close: (_state, { node }, source): ClassLines => linesOf(node, source),
});

function linesOf({ loc }: TSESTree.Node, { ast, file }: Source): ClassLines {
  if (ast.tokens === undefined || ast.comments === undefined) {
    throw new Error(`class-lines needs the tokens and comments of ${file}, which its parse left out.`);
  }

  const within = (line: number): boolean => line >= loc.start.line && line <= loc.end.line;
  const code = new Set(ast.tokens.flatMap(spannedLines).filter(within));
  const comments = new Set(ast.comments.flatMap(spannedLines).filter((line) => within(line) && !code.has(line)));

  return {
    code: code.size,
    comments: comments.size,
    blank: loc.end.line - loc.start.line + 1 - code.size - comments.size,
  };
}

function spannedLines({ loc }: { readonly loc: TSESTree.SourceLocation }): number[] {
  return Array.from({ length: loc.end.line - loc.start.line + 1 }, (_, offset) => loc.start.line + offset);
}
