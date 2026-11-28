import { coreRule, sizeRemedy, wrapRule } from '../wrap-rule.ts';

export const maxStatements = wrapRule({
  name: 'max-statements',
  // Stryker disable next-line StringLiteral: read only by the error for a rule that could not be loaded, and ESLint core has this one
  wraps: 'max-statements',
  upstream: coreRule('max-statements'),
  docs: {
    description: 'Report a function with more statements than allowed',
    concept: 'Long Function',
    cures: ['Extract Function'],
    requiresTypeChecking: false,
    remedy: sizeRemedy,
    tier: 'strict',
  },
  message:
    'Stop and look: Long Function, {{name}} has {{count}} statements (at most {{max}}). Look for runs of statements ' +
    'that together make one step. Cure: Extract Function for each step, named for what it does.',
  defaultOptions: [{ max: 5 }],
});
