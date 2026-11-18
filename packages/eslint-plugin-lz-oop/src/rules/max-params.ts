import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import { sizeRemedy, wrapRule } from '../wrap-rule.ts';

export const maxParams = wrapRule({
  name: 'max-params',
  wraps: '@typescript-eslint/max-params',
  upstream: tseslintPlugin.rules['max-params'],
  docs: {
    description: 'Report a function with more parameters than allowed, not counting a `this` parameter',
    concept: 'Long Parameter List',
    requiresTypeChecking: false,
    remedy: sizeRemedy,
    tier: 'strict',
  },
  message:
    'Stop and look: Long Parameter List, {{name}} takes {{count}} parameters (at most {{max}}). Look for values that ' +
    'travel together, or a flag that picks the behaviour. Cure: Introduce Parameter Object, Preserve Whole Object, ' +
    'or Remove Flag Argument; moving the same values into an options object does not cure it.',
  defaultOptions: [{ max: 3 }],
});
