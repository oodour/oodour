import { defineSelectorRule, type SelectorRow } from '../define-selector-rule.ts';
import { hashPrivateMember } from '../hash-private-member.ts';

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
      "Switch Statements: this switch picks behaviour by the object's kind. Look for branches that do each kind's work rather than only choose an object. Cure: Replace Conditional with Polymorphism, an object per kind, chosen once by a factory.",
    because: 'which objects take over each branch is a design decision no tool can make',
  },
  {
    name: 'ts-private',
    description: 'Report the TypeScript private modifier where a #private member keeps the privacy at run time',
    concept: 'Private state',
    tier: 'recommended',
    selectors: [
      ":matches(PropertyDefinition, MethodDefinition[kind!='constructor'])[accessibility='private']:not(PropertyDefinition[value.callee.name='inject'])",
    ],
    message:
      'Inappropriate Intimacy: TypeScript checks this private member only at compile time, so bracket access or a cast still reaches it. Look for code outside the class that reads it. Cure: make it a #private member, which the suggestion does.',
    suggest: {
      message: 'Make it a #private member and rename its uses through this in this class.',
      because:
        'a use outside the class body, through another instance, or by a computed key would break, so a person confirms the rename',
      fix: hashPrivateMember,
    },
  },
  {
    name: 'module-let',
    description: 'Report a let declared at the top level of a module',
    concept: 'Global Data',
    tier: 'strict',
    selectors: ["Program > VariableDeclaration[kind='let']"],
    message:
      'Global Data: this module keeps state that any function in it may change. Look for the functions that read and write it. Cure: Encapsulate Variable, then move the state into an object that is handed to the code that needs it.',
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
      'Long Parameter List: this function unpacks more than four values from one object, a long list in another form. Look for values that travel together, or for more than one job. Cure: Introduce Parameter Object, a type with behaviour of its own, or Extract Function to split the jobs.',
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
      'Hidden dependency: this constructor creates its collaborator, which ties the class to one concrete class. Look for the class it names. Cure: inject the collaborator as a constructor parameter, with this one as its default if most callers want it.',
    because:
      'the cure adds a constructor parameter, which a person should name; a codemod that injects the collaborator is planned',
  },
  {
    name: 'optional-collaborator',
    description: 'Report optional chaining on a field of `this`',
    concept: 'Null Object',
    tier: 'strict',
    selectors: ["MemberExpression[optional=true][object.type='MemberExpression'][object.object.type='ThisExpression']"],
    message:
      'Repeated absence check: this asks whether a collaborator is there before talking to it. Look for the same check in other methods. Cure: Introduce Special Case, a Null Object set when this object is built, so the code just sends the message.',
    because: 'the cure needs a stand-in object whose behaviour a person decides',
  },
  {
    name: 'optional-private-field',
    description: 'Report an optional #private field',
    concept: 'Temporary Field',
    tier: 'strict',
    selectors: ["PropertyDefinition[optional=true][key.type='PrivateIdentifier']"],
    message:
      'Temporary Field: this private field holds a value for only part of the life of the object, so every method must ask whether it is there. Look for the fields set together. Cure: Extract Class for them, created when their values are known.',
    because: 'which fields move into the new object, and who creates it, is for a person to decide',
  },
] as const satisfies readonly SelectorRow[];

export type SelectorRuleName = (typeof selectorRows)[number]['name'];

export const selectorRules = selectorRows.map((row) => defineSelectorRule(row));
