import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.ts';

export const dataClumps = createRule<[], 'found'>({
  name: 'data-clumps',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report a group of parameters that travels together through three or more functions of one scope',
      concept: 'Data Clumps',
      requiresTypeChecking: false,
      remedy: { kind: 'none', because: 'which object the parameters become is a design decision no tool can make' },
      tier: 'strict',
      skipsTestFiles: true,
    },
    messages: {
      found:
        'Stop and look: Data Clumps, the parameters {{clump}} travel together through {{count}} functions here. Look ' +
        'for the object they describe. Cure: Introduce Parameter Object, one object for them and the behaviour that ' +
        'uses them; or Preserve Whole Object where a caller already holds an object that carries them.',
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    const reportClumps = (methods: readonly { node: TSESTree.Node; names: readonly string[] }[]): void => {
      largestClumps(methods).forEach(({ names, holders }) => {
        context.report({ node: holders[0].node, messageId: 'found', data: { clump: names.join(', '), count: holders.length } });
      });
    };

    return {
      ClassBody(node) {
        reportClumps(
          node.body
            .filter((member) => member.type === AST_NODE_TYPES.MethodDefinition)
            .filter((method) => method.value.type !== AST_NODE_TYPES.TSEmptyBodyFunctionExpression)
            .map((method) => ({ node: method, names: parameterNames(method.value) })),
        );
      },
      Program(node) {
        reportClumps(moduleFunctions(node).map((fn) => ({ node: fn, names: parameterNames(fn) })));
      },
    };
  },
});

/** The functions a module declares at its top level, exported or not, including those a `const` holds. */
function moduleFunctions(program: TSESTree.Program): readonly TSESTree.FunctionLike[] {
  return program.body
    .map((statement) =>
      statement.type === AST_NODE_TYPES.ExportNamedDeclaration && statement.declaration ? statement.declaration : statement,
    )
    .flatMap<TSESTree.FunctionLike>((statement) => {
      if (statement.type === AST_NODE_TYPES.FunctionDeclaration) {
        return [statement];
      }

      if (statement.type === AST_NODE_TYPES.VariableDeclaration) {
        return statement.declarations.flatMap(({ init }) =>
          init?.type === AST_NODE_TYPES.ArrowFunctionExpression || init?.type === AST_NODE_TYPES.FunctionExpression
            ? [init]
            : [],
        );
      }

      return [];
    });
}

function parameterNames(fn: TSESTree.FunctionLike): readonly string[] {
  return fn.params
    .map((param) => (param.type === AST_NODE_TYPES.AssignmentPattern ? param.left : param))
    .flatMap((param) => (param.type === AST_NODE_TYPES.Identifier && param.name !== 'this' ? [param.name] : []));
}

type Clump<T> = { readonly names: readonly string[]; readonly holders: readonly [T, ...T[]] };

/**
 * The largest groups of two or more names that three or more of the functions share, each sorted, with the functions
 * that take them in source order. Such a group is a pair's shared names, or those cut down by a third function, so the
 * search never walks every triple of functions. Only the largest groups are kept, unlike Reek, which also reports each
 * smaller group inside them and so reported the same function more than once.
 */
function largestClumps<T extends { readonly names: readonly string[] }>(functions: readonly T[]): Clump<T>[] {
  // Functions with the same names are compared once, and a name leads to the lists that hold it, so only lists that
  // share a name meet.
  const lists = [
    ...Map.groupBy(
      functions.map((fn, position) => ({ fn, position, names: [...new Set(fn.names)].toSorted() })),
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

  const clumps = [...candidates.values()].flatMap((names): Clump<T>[] => {
    const holders = (listsHolding.get(names[0] ?? '') ?? [])
      .flatMap((index) => lists[index] ?? [])
      .filter((list) => names.every((name) => list.names.has(name)))
      .flatMap((list) => list.holders)
      .toSorted((a, b) => a.position - b.position)
      .map(({ fn }) => fn);
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
