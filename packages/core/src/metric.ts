import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { visitorKeys } from '@typescript-eslint/visitor-keys';
import type { Source } from './source.ts';
import { type Position, type Unit, type UnitKind, unitsAt } from './units.ts';

/**
 * A metric is a fold over the nodes of a unit. The walk owns the stack of units; the metric says what a fresh unit
 * starts with, what each node adds, and what the unit is worth when it closes.
 *
 * What the walk guarantees:
 *
 * 1. A node that opens a unit opens it before `enter` runs for that node, and closes it after `leave`. So a function
 *    sitting in a scored position (a ternary's `alternate`) receives the score for that position itself. A node that
 *    opens two units (a class as a field's value) opens them outermost first and closes them in reverse.
 * 2. `state` is the state of the innermost open unit of a kind the metric measures. Outside every such unit, `enter`
 *    and `leave` are not called.
 * 3. Children are visited in typescript-eslint's visitor-key order, the order ESLint walks them in.
 */
export interface MetricDefinition<TValue, TState, TKind extends UnitKind = UnitKind> {
  /** Also the name the measuring command prints. */
  readonly name: string;
  readonly units: readonly TKind[];
  readonly open: (unit: UnitOf<TKind>, source: Source) => TState;
  readonly enter?: (node: TSESTree.Node, state: TState, at: Position, source: Source) => void;
  readonly leave?: (node: TSESTree.Node, state: TState, at: Position, source: Source) => void;
  /** `undefined` means the unit has nothing to report. */
  readonly close: (state: TState, unit: UnitOf<TKind>, source: Source) => TValue | undefined;
}

/** The units of the given kinds. An intersection, not `Extract`, so a metric of fewer kinds fits where any is taken. */
export type UnitOf<TKind extends UnitKind> = Unit & { readonly kind: TKind };

/** One value of one metric for one unit. */
export interface Measurement<TValue, TKind extends UnitKind = UnitKind> {
  readonly unit: UnitOf<TKind>;
  readonly value: TValue;
}

/** One metric's pass over one file, with its state type closed over. */
interface Run<TValue, TKind extends UnitKind> {
  open(unit: Unit): void;
  enter(node: TSESTree.Node, at: Position): void;
  leave(node: TSESTree.Node, at: Position): void;
  close(unit: Unit): void;
  readonly measurements: readonly Measurement<TValue, TKind>[];
}

const start: unique symbol = Symbol('start');
const read: unique symbol = Symbol('read');

/** A defined metric. Its state type is gone, so metrics of different shapes sit in one array. */
export interface Metric<TValue, TKind extends UnitKind = UnitKind> {
  readonly name: string;
  readonly units: readonly TKind[];
  /** Starts this metric's pass over one file, filed under the walk it belongs to. */
  readonly [start]: (source: Source, walk: object) => Run<TValue, TKind>;
  /** This metric's measurements from a walk, or undefined when the walk did not include it. */
  readonly [read]: (walk: object) => readonly Measurement<TValue, TKind>[] | undefined;
}

/** The one way to make a metric. */
export function defineMetric<TValue, TState, TKind extends UnitKind>(
  definition: MetricDefinition<TValue, TState, TKind>,
): Metric<TValue, TKind> {
  const { name, units, open, enter, leave, close } = definition;
  const measures = new Set<UnitKind>(units);
  const isMeasured = (unit: Unit): unit is UnitOf<TKind> => measures.has(unit.kind);
  const runs = new WeakMap<object, Run<TValue, TKind>>();

  return {
    name,
    units,
    [read]: (walk) => runs.get(walk)?.measurements,
    [start]: (source, walk) => {
      const states: { readonly unit: UnitOf<TKind>; readonly state: TState; readonly at: number }[] = [];
      const slots: (Measurement<TValue, TKind> | undefined)[] = [];
      const run: Run<TValue, TKind> = {
        open(unit) {
          if (isMeasured(unit)) {
            states.push({ unit, state: open(unit, source), at: slots.length });
            slots.push(undefined);
          }
        },
        enter(node, at) {
          const top = states.at(-1);

          if (top !== undefined) {
            enter?.(node, top.state, at, source);
          }
        },
        leave(node, at) {
          const top = states.at(-1);

          if (top !== undefined) {
            leave?.(node, top.state, at, source);
          }
        },
        close(unit) {
          const top = states.at(-1);

          if (top?.unit !== unit) {
            return;
          }

          states.pop();
          const value = close(top.state, top.unit, source);
          slots[top.at] = value === undefined ? undefined : { unit: top.unit, value };
        },
        get measurements() {
          return slots.filter((slot) => slot !== undefined);
        },
      };

      runs.set(walk, run);

      return run;
    },
  };
}

export interface Measurements {
  /** In source order of where each unit starts. Throws for a metric that was not in the run. */
  of<TValue, TKind extends UnitKind>(metric: Metric<TValue, TKind>): readonly Measurement<TValue, TKind>[];
}

/** One walk of the tree for all the given metrics. No I/O. */
export function measure(source: Source, metrics: readonly Metric<unknown>[]): Measurements {
  const thisWalk = {};
  const runs = metrics.map((metric) => metric[start](source, thisWalk));

  walk(source.ast, { parent: undefined, key: undefined }, runs);

  return {
    of<TValue, TKind extends UnitKind>(metric: Metric<TValue, TKind>) {
      const measurements = metric[read](thisWalk);

      if (measurements === undefined) {
        throw new Error(`The metric '${metric.name}' was not measured in this run.`);
      }

      return measurements;
    },
  };
}

function walk(node: TSESTree.Node, at: Position, runs: readonly Run<unknown, UnitKind>[]): void {
  const units = unitsAt(node, at);

  for (const unit of units) {
    for (const run of runs) {
      run.open(unit);
    }
  }

  for (const run of runs) {
    run.enter(node, at);
  }

  for (const key of visitorKeys[node.type] ?? []) {
    const child: unknown = Reflect.get(node, key);

    for (const item of Array.isArray(child) ? child : [child]) {
      if (isNode(item)) {
        walk(item, { parent: node, key }, runs);
      }
    }
  }

  for (const run of runs) {
    run.leave(node, at);
  }

  for (const unit of units.toReversed()) {
    for (const run of runs) {
      run.close(unit);
    }
  }
}

/** A child under a visitor key is a node, `null`, or (in a sparse array pattern) a hole. */
function isNode(value: unknown): value is TSESTree.Node {
  return typeof value === 'object' && value !== null && 'type' in value;
}
