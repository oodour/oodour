import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import type { ReportDescriptor, RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { createRule } from '../create-rule.ts';

const upstream = tseslintPlugin.rules['class-methods-use-this'];

if (upstream === undefined) {
  throw new Error('The installed @typescript-eslint/eslint-plugin has no class-methods-use-this rule to wrap.');
}

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
export const classMethodsUseThis = createRule<Options, 'noState'>({
  name: 'class-methods-use-this',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a class method that uses no state of its object',
      concept: 'A method belongs with the data it works on',
      requiresTypeChecking: false,
      remedy: { kind: 'none', because: "the method's new home is a design choice" },
      tier: 'strict',
    },
    messages: {
      noState:
        'The {{name}} uses no state of its object. Move it to the object whose data it works on, or make it a module ' +
        'function if it is a pure calculation with no variants; keep `static` only for a method that builds an instance.',
    },
    schema: upstream.meta.schema,
    defaultOptions: [{ ignoreOverrideMethods: true, ignoreClassesThatImplementAnInterface: true }],
  },
  create(context, options) {
    // ESLint freezes the context, so a Proxy may not change `options` or `report`; an object that inherits from the
    // context and shadows both may.
    const forwarding: unknown = Object.create(context, {
      options: { value: options },
      report: {
        value: (descriptor: ReportDescriptor<string>) => {
          context.report({ ...descriptor, messageId: 'noState', suggest: null });
        },
      },
    });

    if (!isRuleContext(forwarding)) {
      throw new Error('The forwarding context lost the rule context it inherits from.');
    }

    return upstream.create(forwarding);
  },
});

function isRuleContext(value: unknown): value is Readonly<RuleContext<string, unknown[]>> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'report' in value &&
    typeof value.report === 'function' &&
    'sourceCode' in value &&
    typeof value.sourceCode === 'object'
  );
}
