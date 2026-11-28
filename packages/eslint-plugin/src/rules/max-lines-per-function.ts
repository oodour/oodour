import { coreRule, sizeRemedy, wrapRule } from '../wrap-rule.ts';

export const maxLinesPerFunction = wrapRule({
  name: 'max-lines-per-function',
  // Stryker disable next-line StringLiteral: read only by the error for a rule that could not be loaded, and ESLint core has this one
  wraps: 'max-lines-per-function',
  upstream: coreRule('max-lines-per-function'),
  docs: {
    description: 'Report a function with more lines than allowed, not counting blank lines and comments',
    concept: 'Long Function',
    cures: ['Extract Function'],
    requiresTypeChecking: false,
    remedy: sizeRemedy,
    tier: 'strict',
    // A test writes its expected values out in full, so it is long by design.
    skipsTestFiles: true,
  },
  message:
    'Stop and look: Long Function, {{name}} has {{lineCount}} lines of code (at most {{maxLines}}). Look for steps ' +
    'that each do one thing, or a block a comment has to explain. Cure: Extract Function for each step, named for ' +
    'what it does.',
  defaultOptions: [{ max: 7, skipBlankLines: true, skipComments: true }],
});
