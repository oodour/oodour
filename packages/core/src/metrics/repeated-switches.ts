import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';
import { defineMetric } from '../metric.ts';

/** Switches of one file that choose among the same cases. */
export interface RepeatedSwitch {
  /** The case labels as source text, sorted and joined by `, `, without `default`. */
  readonly cases: string;
  /** In source order, two or more. */
  readonly switches: readonly TSESTree.SwitchStatement[];
}

/**
 * The switches of a file grouped by their case labels, compared as source text in any order and without `default`;
 * only groups of two or more switches with at least one case label count. A file with none has nothing to report.
 */
export const repeatedSwitches = defineMetric({
  name: 'repeated-switches',
  units: ['file'],
  open: () => new Map<string, TSESTree.SwitchStatement[]>(),
  enter(node, switchesByCases, _at, { text }) {
    if (node.type !== AST_NODE_TYPES.SwitchStatement) {
      return;
    }

    const cases = node.cases
      .flatMap(({ test }) => (test === null ? [] : [text.slice(...test.range)]))
      .toSorted()
      .join(', ');

    switchesByCases.set(cases, [...(switchesByCases.get(cases) ?? []), node]);
  },
  close(switchesByCases): readonly RepeatedSwitch[] | undefined {
    const repeated = [...switchesByCases]
      .filter(([cases, switches]) => cases !== '' && switches.length > 1)
      .map(([cases, switches]) => ({ cases, switches }));

    return repeated.length === 0 ? undefined : repeated;
  },
});
