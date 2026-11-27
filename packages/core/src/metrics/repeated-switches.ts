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
  open: (): TSESTree.SwitchStatement[] => [],
  enter(node, switches) {
    if (node.type === AST_NODE_TYPES.SwitchStatement) {
      switches.push(node);
    }
  },
  close(switches, _unit, { text }): readonly RepeatedSwitch[] | undefined {
    const casesOf = (node: TSESTree.SwitchStatement): string =>
      node.cases
        .flatMap(({ test }) => (test === null ? [] : [text.slice(...test.range)]))
        .toSorted()
        .join(', ');
    const repeated = [...Map.groupBy(switches, casesOf)]
      .filter(([cases, group]) => cases !== '' && group.length > 1)
      .map(([cases, group]) => ({ cases, switches: group }));

    return repeated.length === 0 ? undefined : repeated;
  },
});
