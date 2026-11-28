import type { Variable } from '@typescript-eslint/scope-manager';
import { AST_NODE_TYPES as T, type TSESTree } from '@typescript-eslint/typescript-estree';
import type ts from 'typescript';
import { builtInConstructors } from '../built-in-constructors.ts';
import { holdsOnly } from '../holds-only.ts';
import { defineMetric } from '../metric.ts';
import { isTyped, type Source, variableOf } from '../source.ts';
import { withoutTypeAssertions } from '../without-type-assertions.ts';

/** A method that uses another object, held in one of its variables, more than it uses its own. */
export interface Envy {
  readonly method: TSESTree.MethodDefinition;
  /** The variable that holds the other object. */
  readonly name: string;
  readonly count: number;
  /** How often the method uses its own object. */
  readonly own: number;
}

/**
 * How many more uses another object needs than the method's own object. Reek reports any lead, but on real code a lead
 * of one was mostly noise: about 15% of those reports were true, and every lead-of-one report sampled was weak or false.
 */
const minimumLead = 2;

interface MethodUses {
  readonly node: TSESTree.MethodDefinition;
  own: number;
  readonly uses: Map<Variable, number>;
}

interface State {
  /** The methods around the current node, innermost last; a function inside a method counts toward it. */
  readonly methods: MethodUses[];
  readonly envies: Envy[];
}

/**
 * Feature Envy in each file: a method whose uses of another object, through one of its own variables, lead its uses of
 * its own object by `minimumLead` or more. With type information, a variable whose type is declared only outside the
 * project (a built-in or a dependency) is left out, since no Move Function can take behaviour there.
 */
export const featureEnvy = defineMetric({
  name: 'feature-envy',
  needs: 'syntax',
  units: ['file'],
  open: (): State => ({ methods: [], envies: [] }),
  enter(node, { methods }, _at, source) {
    const method = methods.at(-1);

    if (node.type === T.MethodDefinition) {
      methods.push({ node, own: 0, uses: new Map() });
    } else if (method !== undefined && (node.type === T.ThisExpression || node.type === T.Super)) {
      method.own += 1;
    } else if (method !== undefined && node.type === T.MemberExpression) {
      countUse(node, method, source);
    }
  },
  leave(node, { methods, envies }) {
    if (node.type !== T.MethodDefinition) {
      return;
    }

    const method = methods.pop();

    if (method !== undefined) {
      envies.push(...enviesOf(method));
    }
  },
  close: ({ envies }): readonly Envy[] | undefined => (envies.length > 0 ? envies : undefined),
});

function countUse(node: TSESTree.MemberExpression, method: MethodUses, source: Source): void {
  const object = withoutTypeAssertions(node.object);
  const variable = object.type === T.Identifier ? variableOf(source, object) : undefined;

  if (variable?.scope.variableScope.block !== method.node.value) {
    return;
  }

  // The types only drop a variable that would be envied; an own field of any type still counts as own.
  if (holdsOwnField(variable)) {
    method.own += 1;
  } else if (!isTemporary(variable) && !cannotTakeAMove(variable, source)) {
    method.uses.set(variable, (method.uses.get(variable) ?? 0) + 1);
  }
}

function enviesOf({ node, own, uses }: MethodUses): Envy[] {
  if (node.static || own === 0) {
    return [];
  }

  // A spread of every count would pass one argument per local and overflow the stack in generated code.
  // Stryker disable next-line LzJsNumericLiteral: every count is at least 1, so a start of 1 or below finds the same highest count
  const most = [...uses.values()].reduce((highest, count) => Math.max(highest, count), 0);

  return [...uses]
    .filter(([, count]) => count === most && count - own >= minimumLead)
    .map(([variable, count]) => ({ method: node, name: variable.name, count, own }));
}

/** Whether, by the program's types, every type the variable may hold is declared only outside the project. */
function cannotTakeAMove(variable: Variable, source: Source): boolean {
  const [definition] = variable.defs;

  if (!isTyped(source) || definition === undefined) {
    return false;
  }

  const { program, esTreeNodeToTSNodeMap } = source.types;
  const checker = program.getTypeChecker();
  const type = checker.getNonNullableType(checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(definition.name)));
  const outsideTheProject = (member: ts.Type): boolean => {
    const declarations = checker.getPropertiesOfType(member).flatMap((property) => property.declarations ?? []);

    return (
      declarations.length > 0 &&
      declarations.every(
        (declaration) =>
          program.isSourceFileDefaultLibrary(declaration.getSourceFile()) ||
          declaration.getSourceFile().fileName.includes('/node_modules/'),
      )
    );
  };

  return (type.isUnion() ? type.types : [type]).every(outsideTheProject);
}

/**
 * Whether the variable holds a built-in collection or a literal the method creates for its own work, or such a value
 * in place of its own field, as in `let batch = this.batch; batch ??= []`.
 */
function isTemporary(variable: Variable): boolean {
  return holdsOnly(
    variable,
    ({ expressions, part }) => !part && expressions.some((value) => createsScratch(value) || isOwnField(value)),
  );
}

/** Whether the value is an object literal or a built-in collection made here. */
function createsScratch(init: TSESTree.Expression): boolean {
  return init.type === T.ObjectExpression || createsCollection(init);
}

/**
 * Whether the value is a built-in collection made here, alone or as the right side of `??`, `||` or `&&`. An object
 * literal on the right says nothing about the type of the left, so it does not count there.
 */
function createsCollection(init: TSESTree.Expression): boolean {
  return (
    init.type === T.ArrayExpression ||
    (init.type === T.NewExpression && init.callee.type === T.Identifier && builtInConstructors.has(init.callee.name)) ||
    (init.type === T.LogicalExpression && createsCollection(withoutTypeAssertions(init.right)))
  );
}

/**
 * Whether the variable holds its own object or one of its fields, as in `const cache = this.cache` or `{ a } = this`,
 * or is a constructor parameter property, which is a field.
 */
function holdsOwnField(variable: Variable): boolean {
  return (
    // Stryker disable next-line MethodExpression: a parameter property's variable has one definition, so some and every agree
    variable.defs.some(
      ({ name }) =>
        name.parent.type === T.TSParameterProperty ||
        (name.parent.type === T.AssignmentPattern && name.parent.parent.type === T.TSParameterProperty),
    ) ||
    holdsOnly(variable, ({ expressions }) => expressions.some(isOwnField))
  );
}

/** Whether the value is the method's own object or one of its fields. */
function isOwnField(value: TSESTree.Expression): boolean {
  return (
    value.type === T.ThisExpression || (value.type === T.MemberExpression && value.object.type === T.ThisExpression)
  );
}
