import type { Tier } from './create-rule.ts';

/** An existing rule that points at an lz-oop concept, turned on at `error` in the presets of its tier. */
export interface Cue {
  readonly cue: string;
  readonly tier: Tier;
  readonly tierReason: string;
  readonly options?: readonly unknown[];
}

/** An existing rule that works against lz-oop, turned off in every preset. */
export interface Conflict {
  readonly conflict: string;
}

/**
 * An existing rule that a cue of the catalog already covers, turned off in every preset so one problem is reported
 * once. Unlike a conflict it does not work against lz-oop, so the `conflicts` config leaves it alone.
 */
export interface Duplicate {
  readonly duplicateOf: string;
}

export type Stance = Cue | Conflict | Duplicate;

export interface RuleSource {
  /** What a rule ID starts with: `''` for ESLint core, `'unicorn/'` for eslint-plugin-unicorn. */
  readonly prefix: string;
  /** Whether a consumer may lack the plugin, so its cues go in a companion config instead of the presets. */
  readonly optional: boolean;
  readonly rules: Readonly<Record<string, Stance>>;
}

const staticAdvice =
  'Right signal, wrong advice: it suggests making the method static. @layzee/lz-oop/class-methods-use-this reports the ' +
  'same methods with advice that fits.';

/** The one place this plugin takes a stance on a rule it does not own: one stance per rule name. */
export const existingRules = {
  core: {
    prefix: '',
    optional: false,
    rules: {
      'max-lines-per-function': {
        cue: 'Long Method: a body over five lines, counted without blank lines and comments.',
        tier: 'strict',
        tierReason: 'A size limit fires on ordinary code.',
        options: [{ max: 7, skipBlankLines: true, skipComments: true }],
      },
      'max-statements': {
        cue: 'Long Method: more than five statements in one function.',
        tier: 'strict',
        tierReason: 'A size limit fires on ordinary code.',
        options: [{ max: 5 }],
      },
      'max-params': { duplicateOf: '@typescript-eslint/max-params' },
      complexity: {
        cue: 'Each path through a function is one more test to write; more than four paths is a function to split.',
        tier: 'strict',
        tierReason: 'A size limit fires on ordinary code.',
        options: [{ max: 4 }],
      },
      'max-depth': {
        cue: 'Nested conditionals: more than two levels of nesting in one function.',
        tier: 'strict',
        tierReason: 'A size limit fires on ordinary code.',
        options: [{ max: 2 }],
      },
      'no-param-reassign': {
        cue: 'A query that changes state: writing to a property of a parameter.',
        tier: 'strict',
        tierReason: 'It also fires on commands that update an object they were handed, which is ordinary code.',
        options: [{ props: true }],
      },
      'no-else-return': {
        conflict:
          'Its autofix flattens an if/else whose two branches are equal alternatives, which lz-oop keeps symmetric on ' +
          'purpose.',
      },
      'max-classes-per-file': {
        conflict: "A role's players and the factory that picks one of them belong in one module.",
      },
      'class-methods-use-this': { conflict: staticAdvice },
    },
  },
  '@typescript-eslint': {
    prefix: '@typescript-eslint/',
    optional: false,
    rules: {
      'max-params': {
        cue: 'Long Parameter List: more than three parameters, not counting a `this` parameter.',
        tier: 'strict',
        tierReason: 'A size limit fires on ordinary code.',
        options: [{ max: 3 }],
      },
      'switch-exhaustiveness-check': {
        cue: 'A choosing switch must name every member of the union, so a new member cannot fall into `default`.',
        tier: 'recommended',
        tierReason: 'It fires only on a switch over a union that misses a member.',
        options: [{ considerDefaultExhaustiveForUnions: false }],
      },
      'prefer-readonly': {
        cue: 'Private state that is never reassigned is an immutable value; say so.',
        tier: 'recommended',
        tierReason: 'It fires only on a private member that nothing reassigns, and fixes it.',
      },
      'dot-notation': {
        cue: 'Bracket access to a private member gets past `private`; dot access makes it a compile error.',
        tier: 'recommended',
        tierReason: 'It fires only on bracket access with a literal key, and fixes it.',
      },
      'parameter-properties': {
        cue: 'Private state is declared as a field, not hidden in the constructor signature.',
        tier: 'strict',
        tierReason: 'Parameter properties are ordinary code in many frameworks.',
      },
      'no-unnecessary-condition': {
        cue: 'A leftover check for absence after a Null Object took its place.',
        tier: 'strict',
        tierReason: 'It fires on many defensive checks in ordinary code, not only leftovers.',
      },
      'no-extraneous-class': {
        cue: 'A class with no instance behaviour is a lazy or speculative element.',
        tier: 'recommended',
        tierReason: 'It fires only on a class with no instance members.',
      },
      'no-unnecessary-type-parameters': {
        cue: 'A type parameter used once is speculative generality.',
        tier: 'recommended',
        tierReason: 'It fires only on a type parameter that relates nothing.',
      },
      'no-unused-private-class-members': {
        cue: 'Private state or behaviour that nothing uses is a lazy element.',
        tier: 'recommended',
        tierReason: 'It fires only on a private member nothing reads.',
      },
      'restrict-template-expressions': {
        cue: 'An object spelled out field by field in a template string is a Data Clump waiting for its own type.',
        tier: 'strict',
        tierReason: 'It fires on ordinary string building as well.',
      },
      'no-base-to-string': {
        cue: 'An object in a template string without its own `toString` prints `[object Object]`.',
        tier: 'recommended',
        tierReason: 'It fires only where the output is certainly wrong.',
      },
      'method-signature-style': {
        cue: 'A role written with property signatures lets the compiler reject a player that narrows a parameter.',
        tier: 'strict',
        tierReason: 'It fires on every method signature, which is ordinary code.',
        options: ['property'],
      },
      'class-methods-use-this': { conflict: staticAdvice },
      'consistent-type-imports': {
        conflict:
          'Its autofix can turn an import whose side effect registers a module into a type-only import, which drops ' +
          'the side effect.',
      },
    },
  },
  '@eslint-community/eslint-comments': {
    prefix: '@eslint-community/eslint-comments/',
    optional: false,
    rules: {
      'require-description': {
        cue:
          'A rule is broken only on purpose: a comment that turns a rule off says why, so the reason is there to ' +
          'review. Comments that turn nothing off need none.',
        tier: 'recommended',
        tierReason: 'It fires only on a comment that turns a rule off without saying why.',
        options: [{ ignore: ['eslint-enable', 'eslint-env', 'exported', 'global', 'globals'] }],
      },
    },
  },
  unicorn: {
    prefix: 'unicorn/',
    optional: true,
    rules: {
      'no-array-sort': {
        cue: 'A query that sorts its own array in place changes state.',
        tier: 'recommended',
        tierReason: 'With its default options it fires only where the sorted array is used as a value.',
      },
      'no-array-reverse': {
        cue: 'A query that reverses its own array in place changes state.',
        tier: 'recommended',
        tierReason: 'With its default options it fires only where the reversed array is used as a value.',
      },
      'no-array-splice': {
        cue: 'Splicing changes an array in place, which a query must not do.',
        tier: 'strict',
        tierReason: 'It fires on every splice, commands included.',
      },
      'prefer-switch': {
        conflict: 'It turns an if chain into a switch, a conditional lz-oop would replace with objects instead.',
      },
      'no-static-only-class': {
        conflict:
          'It finds a class with only static members but autofixes it into a plain object, where lz-oop moves the ' +
          'behaviour onto instances.',
      },
    },
  },
  sonarjs: {
    prefix: 'sonarjs/',
    optional: true,
    rules: {
      'cognitive-complexity': {
        cue: 'A function that is hard to follow is a function to split.',
        tier: 'strict',
        tierReason: 'A size limit fires on ordinary code.',
        options: [5],
      },
      'bool-param-default': {
        conflict: 'It asks for a default on a boolean parameter, which keeps a flag argument lz-oop would remove.',
      },
    },
  },
  functional: {
    prefix: 'functional/',
    optional: true,
    rules: {
      'immutable-data': {
        cue: 'A query that changes data it was handed.',
        tier: 'strict',
        tierReason: 'It fires on every mutation outside a class, commands included.',
        options: [{ ignoreClasses: 'fieldsOnly' }],
      },
      'no-classes': { conflict: 'It bans classes, the unit lz-oop designs with.' },
      'no-this-expressions': { conflict: "It bans `this`, which an object's own methods need." },
      'no-class-inheritance': { conflict: 'It bans inheritance, which lz-oop allows for a shallow hierarchy.' },
      'no-mixed-types': { conflict: 'It bans a type that holds both data and behaviour, which is what an object is.' },
      'no-return-void': { conflict: 'It bans a void return, which a command has by design.' },
    },
  },
} as const satisfies Readonly<Record<string, RuleSource>>;

export type SourceId = keyof typeof existingRules;

type Catalog = typeof existingRules;

type ConfiguredIdsOf<TSource extends SourceId> = {
  [TName in keyof Catalog[TSource]['rules']]: Catalog[TSource]['rules'][TName] extends { readonly options: readonly unknown[] }
    ? `${Catalog[TSource]['prefix']}${TName & string}`
    : never;
}[keyof Catalog[TSource]['rules']];

/** The ID of every cue the catalog sets options for: each needs RuleTester cases that pin those options. */
export type ConfiguredRuleId = { [TSource in SourceId]: ConfiguredIdsOf<TSource> }[SourceId];

/** One catalog entry with the rule ID a config uses for it. */
export interface CatalogRow {
  readonly source: SourceId;
  readonly name: string;
  readonly id: string;
  readonly stance: Stance;
}

/** Every catalog entry, one row per rule. */
export function listExistingRules(): readonly CatalogRow[] {
  return Object.keys(existingRules)
    .filter(isSourceId)
    .flatMap((source) => {
      const { prefix, rules }: RuleSource = existingRules[source];

      return Object.entries(rules).map(([name, stance]) => ({ source, name, id: `${prefix}${name}`, stance }));
    });
}

function isSourceId(key: string): key is SourceId {
  return Object.hasOwn(existingRules, key);
}
