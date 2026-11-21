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
      const clumps = new Set(
        triplesOf(methods)
          .map(([first, second, third]) =>
            first.names.filter((name) => second.names.includes(name) && third.names.includes(name)),
          )
          .filter((shared) => shared.length >= 2)
          .map((shared) => shared.toSorted().join(', ')),
      );

      clumps.forEach((clump) => {
        const holders = methods.filter(({ names }) => clump.split(', ').every((name) => names.includes(name)));
        const [first] = holders;

        if (first) {
          context.report({ node: first.node, messageId: 'found', data: { clump, count: holders.length } });
        }
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
    .flatMap((param) => (param.type === AST_NODE_TYPES.Identifier ? [param.name] : []));
}

/** Every way to pick three items, each in its original order. */
function triplesOf<T>(items: readonly T[]): (readonly [T, T, T])[] {
  return items.flatMap((first, i) =>
    items.slice(i + 1).flatMap((second, j) => items.slice(i + j + 2).map((third) => [first, second, third] as const)),
  );
}
