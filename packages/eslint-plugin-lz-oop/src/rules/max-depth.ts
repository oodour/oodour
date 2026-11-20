import { coreRule, sizeRemedy, wrapRule } from '../wrap-rule.ts';

export const maxDepth = wrapRule({
  name: 'max-depth',
  wraps: 'max-depth',
  upstream: coreRule('max-depth'),
  docs: {
    description: 'Report blocks nested deeper than allowed',
    concept: 'Nested Conditionals',
    requiresTypeChecking: false,
    remedy: sizeRemedy,
    tier: 'strict',
  },
  message:
    'Stop and look: Nested Conditionals, blocks nested {{depth}} deep (at most {{maxDepth}}). Look for an inner block ' +
    'that does a job of its own. Cure: Replace Nested Conditional with Guard Clauses, or Extract Function.',
  defaultOptions: [{ max: 2 }],
});
