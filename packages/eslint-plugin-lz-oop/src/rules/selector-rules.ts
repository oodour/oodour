import { defineSelectorRule, type SelectorRow } from '../define-selector-rule.ts';
import { builtInConstructors as builtInNames } from '../built-in-constructors.ts';

/**
 * The selector rules that two measurements over five repositories kept, each in the sharpened form that measured
 * best. `selector-rules.test.ts` must hold cases for every name here, or type-checking fails.
 */
const builtInConstructors = `/^(${[...builtInNames].join('|')})$/`;

const selectorRows = [
  {
    name: 'switch-on-kind',
    description: "Report a switch on an object's kind tag",
    concept: 'Switch Statements',
    tier: 'strict',
    selectors: ["SwitchStatement[discriminant.type='MemberExpression'][discriminant.property.name='kind']"],
    message:
      "Stop and look: Switch Statements, this switch picks behaviour by the object's kind. Look for branches that do each kind's work rather than only choose an object. Cure: Replace Conditional with Polymorphism, an object per kind, chosen once by a factory.",
    because: 'which objects take over each branch is a design decision no tool can make',
  },
  {
    name: 'module-let',
    description: 'Report a let declared at the top level of a module',
    concept: 'Global Data',
    tier: 'strict',
    selectors: ["Program > VariableDeclaration[kind='let']"],
    message:
      'Stop and look: Global Data, this module keeps state that any function in it may change. Look for the functions that read and write it. Cure: Encapsulate Variable, then move the state into an object that is handed to the code that needs it.',
    because: 'the cure moves the state into an object and changes every reader, which needs a person',
  },
  {
    name: 'new-collaborator',
    description: 'Report a method or field initializer that creates its own collaborator',
    concept: 'Dependency Inversion',
    tier: 'strict',
    selectors: [
      `MethodDefinition[static=false] > FunctionExpression > BlockStatement NewExpression:not([callee.name=${builtInConstructors}]):not(ThrowStatement > NewExpression):not(ReturnStatement > NewExpression):not(ArrowFunctionExpression > NewExpression)`,
      `PropertyDefinition > NewExpression.value:not([callee.name=${builtInConstructors}])`,
    ],
    message:
      'Stop and look: Dependency Inversion, this class creates its own collaborator, so it depends on one concrete class instead of the role it needs. Look for the class it names. Cure: Dependency Injection, the collaborator as a constructor or method parameter; keep this class as a default only while existing callers still need it, and let a factory be the one place that creates it when it varies.',
    because:
      'the cure adds a constructor parameter, which a person should name; a codemod that injects the collaborator is planned',
  },
  {
    name: 'optional-collaborator',
    description: 'Report optional chaining on a field of `this`',
    concept: 'Repeated Absence Check',
    tier: 'strict',
    selectors: ["MemberExpression[optional=true][object.type='MemberExpression'][object.object.type='ThisExpression']"],
    message:
      'Stop and look: Repeated Absence Check, this asks whether a collaborator is there before talking to it. Look for the same check in other methods. Cure: Introduce Special Case, a Null Object set when this object is built, so the code just sends the message.',
    because: 'the cure needs a stand-in object whose behaviour a person decides',
  },
  {
    name: 'optional-private-field',
    description: 'Report an optional #private field',
    concept: 'Temporary Field',
    tier: 'strict',
    selectors: ["PropertyDefinition[optional=true][key.type='PrivateIdentifier']"],
    message:
      'Stop and look: Temporary Field, this private field holds a value for only part of the life of the object, so every method must ask whether it is there. Look for the fields set together. Cure: Extract Class for them, created when their values are known.',
    because: 'which fields move into the new object, and who creates it, is for a person to decide',
  },
] as const satisfies readonly SelectorRow[];

export type SelectorRuleName = (typeof selectorRows)[number]['name'];

export const selectorRules = selectorRows.map((row) => defineSelectorRule(row));
