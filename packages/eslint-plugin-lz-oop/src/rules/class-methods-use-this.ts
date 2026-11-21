import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import { wrapRule } from '../wrap-rule.ts';

type Options = [
  {
    readonly exceptMethods?: readonly string[];
    readonly enforceForClassFields?: boolean;
    readonly ignoreOverrideMethods?: boolean;
    readonly ignoreClassesThatImplementAnInterface?: boolean | 'public-fields';
  },
];

/**
 * typescript-eslint's class-methods-use-this under a message of our own: its own message steers toward `static`, which
 * keeps the method on a class whose state it never uses.
 */
export const classMethodsUseThis = wrapRule<Options>({
  name: 'class-methods-use-this',
  wraps: '@typescript-eslint/class-methods-use-this',
  upstream: tseslintPlugin.rules['class-methods-use-this'],
  docs: {
    description: 'Report a class method that uses no state of its object',
    concept: 'Feature Envy',
    cures: ['Move Function'],
    requiresTypeChecking: false,
    remedy: { kind: 'none', because: "the method's new home is a design choice" },
    tier: 'strict',
    // A test fake may put its behaviour on the static side.
    skipsTestFiles: true,
  },
  message:
    'Stop and look: Feature Envy, the {{name}} uses no state of its object. Look at whose data it reads. Cure: Move ' +
    'Function to that object, or to a module function for a pure calculation; keep `static` only for a method that builds an instance.',
  defaultOptions: [{ ignoreOverrideMethods: true, ignoreClassesThatImplementAnInterface: true }],
});
