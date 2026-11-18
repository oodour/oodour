import { coreRule, sizeRemedy, wrapRule } from '../wrap-rule.ts';

export const complexity = wrapRule({
  name: 'complexity',
  wraps: 'complexity',
  upstream: coreRule('complexity'),
  docs: {
    description: 'Report a function with more paths through it than allowed',
    concept: 'Complex conditional logic',
    requiresTypeChecking: false,
    remedy: sizeRemedy,
    tier: 'strict',
  },
  message:
    'Stop and look: Complex Conditional, {{name}} has {{complexity}} paths (at most {{max}}), each one more test. ' +
    'Look for branches that do the work of one kind each, or the same absence check repeated. Cure: Decompose ' +
    'Conditional, Replace Conditional with Polymorphism, or Introduce Special Case.',
  defaultOptions: [{ max: 4 }],
});
