import { optionalPluginRule, sizeRemedy, wrapRule } from '../wrap-rule.ts';

export const cognitiveComplexity = wrapRule({
  name: 'cognitive-complexity',
  upstream: optionalPluginRule(
    // Stryker disable next-line StringLiteral: the prefix shows only in the error for a missing eslint-plugin-sonarjs, which every test run installs; wrap-rule.test.ts covers that error
    'sonarjs',
    'eslint-plugin-sonarjs',
    'cognitive-complexity',
  ),
  docs: {
    description: 'Report a function that is harder to follow than allowed, by its cognitive complexity',
    concept: 'Long Function',
    cures: ['Replace Nested Conditional with Guard Clauses', 'Extract Function'],
    requiresTypeChecking: false,
    remedy: sizeRemedy,
    tier: 'strict',
    companion: 'sonarjs',
  },
  message:
    'Stop and look: Long Function, this one is hard to follow (cognitive complexity {{complexityAmount}}, at most ' +
    '{{threshold}}). Look for nested conditionals and loops, and jumps out of the straight flow. Cure: Replace Nested ' +
    'Conditional with Guard Clauses, and Extract Function for each nested block.',
  defaultOptions: [4],
});
