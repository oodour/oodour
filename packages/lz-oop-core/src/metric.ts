import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { visitorKeys } from '@typescript-eslint/visitor-keys';
import type { Source } from './source.ts';
import { type Position, type Unit, type UnitKind, unitKindsOf } from './units.ts';

/**
 * A metric is a fold over the nodes of a unit. The walk owns the stack of units; the metric says what a fresh unit
 * starts with, what each node adds, and what the unit is worth when it closes.
 *
 * What the walk guarantees:
 *
 * 1. A node that opens a unit opens it before `enter` runs for that node, and closes it after `leave`. So a function
 *    sitting in a scored position (a ternary's `alternate`) receives the score for that position itself.
 * 2. `state` is the state of the innermost open unit of a kind the metric measures. Outside every such unit, `enter`
 *    and `leave` are not called.
 * 3. Children are visited in typescript-eslint's visitor-key order, the order ESLint walks them in.
 */
export interface MetricDefinition<TValue, TState> {
  /** Also the name the measuring command prints. */
  readonly name: string;
  readonly units: readonly UnitKind[];
  readonly open: (unit: Unit, source: Source) => TState;
  readonly enter?: (node: TSESTree.Node, state: TState, at: Position, source: Source) => void;
  readonly leave?: (node: TSESTree.Node, state: TState, at: Position, source: Source) => void;
  /** `undefined` means the unit has nothing to report. */
  readonly close: (state: TState, unit: Unit, source: Source) => TValue | undefined;
}

/** One value of one metric for one unit. */
export interface Measurement<TValue> {
  readonly unit: Unit;
  readonly value: TValue;
}

/** One metric's pass over one file, with its state type closed over. */
interface Run<TValue> {
  open(unit: Unit): void;
  enter(node: TSESTree.Node, at: Position): void;
  leave(node: TSESTree.Node, at: Position): void;
  close(unit: Unit): void;
  readonly measurements: readonly Measurement<TValue>[];
}

const start: unique symbol = Symbol('start');
const read: unique symbol = Symbol('read');

/** A defined metric. Its state type is gone, so metrics of different shapes sit in one array. */
export interface Metric<TValue> {
  readonly name: string;
  readonly units: readonly UnitKind[];
  /** Starts this metric's pass over one file, filed under the walk it belongs to. */
  readonly [start]: (source: Source, walk: object) => Run<TValue>;
  /** This metric's measurements from a walk, or undefined when the walk did not include it. */
  readonly [read]: (walk: object) => readonly Measurement<TValue>[] | undefined;
}

/** The one way to make a metric. */
export function defineMetric<TValue, TState>(definition: MetricDefinition<TValue, TState>): Metric<TValue> {
  const { name, units, open, enter, leave, close } = definition;
  const measures = new Set(units);
  const runs = new WeakMap<object, Run<TValue>>();

  return {
    name,
    units,
    [read]: (walk) => runs.get(walk)?.measurements,
    [start]: (source, walk) => {
      const states: { readonly unit: Unit; readonly state: TState; readonly at: number }[] = [];
      const slots: (Measurement<TValue> | undefined)[] = [];
      const run: Run<TValue> = {
        open(unit) {
          if (measures.has(unit.kind)) {
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
          const value = close(top.state, unit, source);
          slots[top.at] = value === undefined ? undefined : { unit, value };
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
  of<TValue>(metric: Metric<TValue>): readonly Measurement<TValue>[];
}

/** One walk of the tree for all the given metrics. No I/O. */
export function measure(source: Source, metrics: readonly Metric<unknown>[]): Measurements {
  const thisWalk = {};
  const runs = metrics.map((metric) => metric[start](source, thisWalk));

  walk(source.ast, { parent: undefined, key: undefined }, undefined, runs);

  return {
    of<TValue>(metric: Metric<TValue>) {
      const measurements = metric[read](thisWalk);

      if (measurements === undefined) {
        throw new Error(`The metric '${metric.name}' was not measured in this run.`);
      }

      return measurements;
    },
  };
}

function walk(node: TSESTree.Node, at: Position, enclosing: Unit | undefined, runs: readonly Run<unknown>[]): void {
  const opened: Unit[] = [];
  let inner = enclosing;

  for (const kind of unitKindsOf(node, at)) {
    inner = { kind, node, parent: at.parent, enclosing: inner };
    opened.push(inner);

    for (const run of runs) {
      run.open(inner);
    }
  }

  for (const run of runs) {
    run.enter(node, at);
  }

  for (const key of visitorKeys[node.type] ?? []) {
    const child: unknown = Reflect.get(node, key);

    for (const item of Array.isArray(child) ? child : [child]) {
      if (isNode(item)) {
        walk(item, { parent: node, key }, inner, runs);
      }
    }
  }

  for (const run of runs) {
    run.leave(node, at);
  }

  for (const unit of opened.reverse()) {
    for (const run of runs) {
      run.close(unit);
    }
  }
}

function isNode(value: unknown): value is TSESTree.Node {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}
