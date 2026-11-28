import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/typescript-estree';
import { defineMetric, type UnitOf } from '../metric.ts';

/** A function of a scope and the names of its parameters. */
export interface ClumpHolder {
  /** A class member, or a module's function. */
  readonly node: TSESTree.Node;
  readonly names: readonly string[];
}

/** A group of parameter names that three or more functions of one scope share. */
export interface DataClump {
  /** Sorted, two or more. */
  readonly names: readonly string[];
  /** The functions that take them, the first in the source first. */
  readonly holders: readonly [ClumpHolder, ...ClumpHolder[]];
}

/**
 * The largest groups of two or more parameter names that three or more functions of one scope take: the methods and
 * function-valued fields of a class, or the functions a module declares at its top level. A scope with none has
 * nothing to report.
 */
export const dataClumps = defineMetric({
  name: 'data-clumps',
  needs: 'syntax',
  units: ['class', 'file'],
  open: () => undefined,
  close: (_state, unit): readonly DataClump[] | undefined => {
    const clumps = largestClumps(holdersOf(unit));

    return clumps.length === 0 ? undefined : clumps;
  },
});

function holdersOf(unit: UnitOf<'class' | 'file'>): readonly ClumpHolder[] {
  switch (unit.kind) {
    case 'class': {
      return unit.node.body.body.flatMap((member) => {
        const fn = memberFunction(member);

        return fn ? [{ node: member, names: parameterNames(fn) }] : [];
      });
    }

    case 'file': {
      return moduleFunctions(unit.node).map((fn) => ({ node: fn, names: parameterNames(fn) }));
    }
  }
}

/** The function a class member runs: a method with a body, or a field that holds a function. */
function memberFunction(member: TSESTree.ClassElement): TSESTree.FunctionLike | undefined {
  if (member.type === AST_NODE_TYPES.MethodDefinition) {
    return member.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression ? undefined : member.value;
  }

  return member.type === AST_NODE_TYPES.PropertyDefinition && member.value && isFunctionExpression(member.value)
    ? member.value
    : undefined;
}

/** The functions a module declares at its top level, exported or not, including those a `const` holds. */
function moduleFunctions(program: TSESTree.Program): readonly TSESTree.FunctionLike[] {
  return program.body
    .map((statement) =>
      (statement.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        statement.type === AST_NODE_TYPES.ExportDefaultDeclaration) &&
      statement.declaration
        ? statement.declaration
        : statement,
    )
    .flatMap<TSESTree.FunctionLike>((statement) => {
      if (statement.type === AST_NODE_TYPES.FunctionDeclaration || isFunctionExpression(statement)) {
        return [statement];
      }

      if (statement.type === AST_NODE_TYPES.VariableDeclaration) {
        return statement.declarations.flatMap(({ init }) => (init && isFunctionExpression(init) ? [init] : []));
      }

      return [];
    });
}

function isFunctionExpression(
  node: TSESTree.Node,
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
  return node.type === AST_NODE_TYPES.ArrowFunctionExpression || node.type === AST_NODE_TYPES.FunctionExpression;
}

function parameterNames(fn: TSESTree.FunctionLike): readonly string[] {
  return fn.params
    .map((param) => (param.type === AST_NODE_TYPES.AssignmentPattern ? param.left : param))
    .flatMap((param) => (param.type === AST_NODE_TYPES.Identifier && param.name !== 'this' ? [param.name] : []));
}

/**
 * The largest groups of two or more names that three or more of the functions share, each sorted, with the functions
 * that take them, the first in the source first: lists keep the order in which their first function appears. Such a
 * group is a pair's shared names, or those cut down by a third function, so the search never walks every triple of
 * functions. Only the largest groups are kept, unlike Reek, which also reports each smaller group inside them and so
 * reported the same function more than once.
 */
function largestClumps(functions: readonly ClumpHolder[]): DataClump[] {
  // Functions with the same names are compared once, and a name leads to the lists that hold it, so only lists that
  // share a name meet.
  const lists = [
    ...Map.groupBy(
      functions.map((fn) => ({ fn, names: [...new Set(fn.names)].toSorted() })),
      ({ names }) => names.join(','),
    ).values(),
  ].map((holders) => ({ names: new Set(holders[0]?.names), holders }));
  const listsHolding = new Map<string, number[]>();

  lists.forEach(({ names }, index) => {
    names.forEach((name) => {
      append(listsHolding, name, index);
    });
  });

  const sharedWith = (names: Iterable<string>): Map<number, string[]> => {
    const shared = new Map<number, string[]>();

    for (const name of names) {
      // Stryker disable next-line ArrayDeclaration: every name searched comes from a list, so the map always holds it
      for (const index of listsHolding.get(name) ?? []) {
        append(shared, index, name);
      }
    }

    return shared;
  };
  const pairs = new Map<string, string[]>();
  const candidates = new Map<string, string[]>();
  const collect = (into: Map<string, string[]>, names: string[]) => {
    if (names.length >= 2) {
      into.set(names.join(', '), names);
    }
  };

  lists.forEach(({ names, holders }, first) => {
    sharedWith(names).forEach((shared, second) => {
      // Stryker disable next-line ConditionalExpression,EqualityOperator,LogicalOperator,LzJsNumericLiteral: it only skips pairs met from both sides, which give the same names; it changes no report, and on 3,000 random functions it measured about a fifth less time
      if (second > first || (second === first && holders.length >= 2)) {
        collect(pairs, shared);
      }
    });
  });
  // Each pair meets its own two lists among the thirds, so the pair itself is collected there.
  pairs.forEach((pair) => {
    sharedWith(pair).forEach((shared) => {
      collect(candidates, shared);
    });
  });

  const clumps = [...candidates.values()].flatMap((names): DataClump[] => {
    // Stryker disable next-line StringLiteral,LzJsNumericLiteral: a candidate has two or more names, and the lists holding any one of them include every list the filter below keeps
    const holders = (listsHolding.get(names[0] ?? '') ?? [])
      .flatMap((index) => lists[index] ?? [])
      .filter((list) => names.every((name) => list.names.has(name)))
      .flatMap((list) => list.holders.map(({ fn }) => fn));
    const [first, ...others] = holders;

    return first && holders.length >= 3 ? [{ names, holders: [first, ...others] }] : [];
  });
  // A larger clump that holds a clump holds its first name too.
  const clumpsHolding = Map.groupBy(
    clumps.flatMap(({ names }) => {
      const held = new Set(names);

      return names.map((name) => ({ name, names: held }));
    }),
    ({ name }) => name,
  );

  return clumps.filter(
    (clump) =>
      // Stryker disable next-line StringLiteral,LzJsNumericLiteral: a clump has two or more names, and a larger clump that holds it holds each of them
      !(clumpsHolding.get(clump.names[0] ?? '') ?? []).some(
        (other) => other.names.size > clump.names.length && clump.names.every((name) => other.names.has(name)),
      ),
  );
}

function append<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key);

  if (values) {
    values.push(value);
  } else {
    map.set(key, [value]);
  }
}
