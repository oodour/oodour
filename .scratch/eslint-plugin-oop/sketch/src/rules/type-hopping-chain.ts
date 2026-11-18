import { createRule } from '../create-rule.ts';

type Options = [{ maxInterfaces: number }];

/**
 * Law of Demeter by the number of distinct types a chain steps through, not by dots: a fluent pipeline on one
 * array type passes, a walk from an order through its customer to an address does not.
 *
 * The shape of every rule module: one named export, built by `createRule`, in a file named after the rule, with
 * `<rule-name>.test.ts` beside it and one line in `rules/index.ts`.
 */
export const typeHoppingChain = createRule<Options, 'chain'>({
  name: 'type-hopping-chain',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a chain that steps through more distinct types than allowed',
      concept: 'Law of Demeter',
      requiresTypeChecking: true,
      remedy: {
        kind: 'codemod',
        codemod: 'hide-delegate',
        because: 'The delegating method goes on a class that is usually declared in another file.',
      },
    },
    // The author writes the problem. `createRule` appends the remedy sentence, here the codemod command.
    messages: {
      chain: 'This chain steps through {{count}} different types; ask the nearest object for what you want.',
    },
    schema: [
      {
        type: 'object',
        properties: { maxInterfaces: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ maxInterfaces: 2 }],
  },
  create(context, [{ maxInterfaces }]) {
    // TODO: port the spike (scratchpad lint/spike/type-hopping-chain.ts).
    // For the outermost MemberExpression of a chain, collect the apparent type of each receiver except `this`,
    // and report when the set is larger than maxInterfaces.
    throw new Error(`not implemented: ${context.id} ${String(maxInterfaces)}`);
  },
});
