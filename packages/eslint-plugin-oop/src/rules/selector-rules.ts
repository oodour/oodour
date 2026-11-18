import { defineSelectorRule, type SelectorRow } from '../define-selector-rule.ts';

/**
 * The selector rules that two measurements over five repositories kept, each in the sharpened form that measured
 * best. `selector-rules.test.ts` must hold cases for every name here, or type-checking fails.
 */
// Values and containers a class may create for itself: they hold its own state, not a collaborator it talks to.
const builtInConstructors =
  '/^(Error|TypeError|RangeError|Map|Set|WeakMap|WeakSet|Array|Date|URL|Promise|RegExp|AbortController)$/';

const selectorRows = [
  {
    name: 'switch-on-kind',
    description: "Report a switch on an object's kind tag",
    concept: 'Replace Conditional with Polymorphism',
    tier: 'recommended',
    selectors: ["SwitchStatement[discriminant.type='MemberExpression'][discriminant.property.name='kind']"],
    message:
      "This switch picks behaviour by the object's kind; an object per kind could do its own part of the work, and a new kind would not touch this switch.",
    because: 'which objects take over each branch is a design decision no tool can make',
  },
  {
    name: 'module-let',
    description: 'Report a let declared at the top level of a module',
    concept: 'Global Data',
    tier: 'strict',
    selectors: ["Program > VariableDeclaration[kind='let']"],
    message:
      'This module keeps state that any function in it may change; an object that owns the state, handed to the code that needs it, makes the dependency visible.',
    because: 'the cure moves the state into an object and changes every reader, which needs a person',
  },
  {
    name: 'options-object-keys',
    description: 'Report a function that unpacks more than four keys from one object parameter',
    concept: 'Long Parameter List',
    tier: 'strict',
    // A callback that unpacks a row it is handed (`rows.map(({ a, b, c, d, e }) => ...)`) is left out.
    selectors: [':function:not(CallExpression > :function) > ObjectPattern.params[properties.length>4]'],
    message:
      'This function unpacks more than four values from one object, which is a long parameter list in another form; the values may belong to an object with behaviour of its own, or the function may do more than one job.',
    because: 'the cure names a new object or splits the function, and changes its callers, which needs a person',
  },
  {
    name: 'new-in-constructor',
    description: 'Report a constructor that creates its own collaborator',
    concept: 'Dependency Injection',
    tier: 'strict',
    selectors: [
      `MethodDefinition[kind='constructor'] > FunctionExpression > BlockStatement NewExpression:not([callee.name=${builtInConstructors}]):not(ThrowStatement > NewExpression)`,
    ],
    message:
      'This constructor creates its collaborator itself, so the class is tied to that one concrete class; take the collaborator as a parameter, with this one as its default if most callers want it.',
    because:
      'the cure adds a constructor parameter, which a person should name; a codemod that injects the collaborator is planned',
  },
] as const satisfies readonly SelectorRow[];

export type SelectorRuleName = (typeof selectorRows)[number]['name'];

export const selectorRules = selectorRows.map((row) => defineSelectorRule(row));
