import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';

/**
 * Reports every switch in a file whose case labels, compared as source text in any order and without `default`, match
 * those of another switch in the file. ESLint sees one file at a time, so repetition across files goes unreported.
 */
export const repeatedSwitches = createRule<[], 'found'>({
  name: 'repeated-switches',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report switches in one file that choose among the same cases',
      concept: 'Repeated Switches',
      requiresTypeChecking: false,
      remedy: { kind: 'none', because: 'which objects take over each case is a design decision no tool can make' },
      tier: 'recommended',
      skipsTestFiles: true,
    },
    messages: {
      found:
        'Stop and look: Repeated Switches, this file has {{count}} switches on the cases {{cases}}. Look for the same ' +
        'choice in other files. Cure: Replace Conditional with Polymorphism, an object per case chosen once by a ' +
        'factory, so each switch becomes a message to that object.',
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    const switchesByCases = new Map<string, TSESTree.SwitchStatement[]>();

    return {
      SwitchStatement(node) {
        const cases = node.cases.flatMap(({ test }) => (test === null ? [] : [context.sourceCode.getText(test)]))
          .toSorted()
          .join(', ');

        switchesByCases.set(cases, [...(switchesByCases.get(cases) ?? []), node]);
      },
      'Program:exit'() {
        [...switchesByCases]
          .filter(([cases, switches]) => cases !== '' && switches.length > 1)
          .forEach(([cases, switches]) => {
            switches.forEach((node) => {
              context.report({ node, messageId: 'found', data: { count: switches.length, cases } });
            });
          });
      },
    };
  },
});
