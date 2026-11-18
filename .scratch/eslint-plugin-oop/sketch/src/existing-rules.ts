/**
 * Every rule this package does not own but takes a position on, in one catalog.
 *
 * The presets, the drift tests, the pinned RuleTester cases and the README tables are all derived from it. Nothing
 * else in the package spells an existing rule's name.
 *
 * Invariants the shape gives for free:
 * - A rule has one stance. The rule name is the object key, so "cue and conflict at once" does not compile.
 * - No stance carries a severity. `presets.ts` writes `warn` for every cue and `off` for every conflict.
 * - No stance says whether the rule needs type information. `presets.ts` reads that from the installed rule.
 */

/** Turned on at `warn` as a prompt to look. Never a gate. */
export interface Cue {
  /** The lz-oop concept the rule prompts a look at: a smell, principle or practice in the plugin's vocabulary. */
  readonly cue: string;
  /**
   * Options the presets set. A cue with options is "configured": `existing-rules.test.ts` has to pin it with
   * RuleTester cases, and that file does not type-check until it does (see `ConfiguredRuleId`).
   */
  readonly options?: readonly unknown[];
}

/** Turned off, because the rule or its autofix works against lz-oop. */
export interface Conflict {
  /** Why. One sentence, shown in the README table next to the rule. */
  readonly conflict: string;
}

export type Stance = Cue | Conflict;

export interface RuleSource {
  /** The npm package the drift test loads the installed rules from. */
  readonly package: string;
  /** The prefix of the rule IDs, as consumers register the plugin. Empty for ESLint core. */
  readonly namespace: string;
  /**
   * `false`: the presets may turn its rules on (ESLint core, or a plugin the presets register themselves).
   * `true`: the consumer may not have it. Its conflicts still go into the presets, because ESLint skips an "off"
   * entry before it looks the plugin up. Its cues go into a companion config named after the source, which only a
   * consumer who registered that plugin adds.
   */
  readonly optional: boolean;
  readonly rules: Readonly<Record<string, Stance>>;
}

// The entries below are examples of each kind. Wave 1 fills the catalog from the audit's Tier 1 table and its
// "rules that work against the plugin" list.
export const existingRules = {
  core: {
    package: 'eslint',
    namespace: '',
    optional: false,
    rules: {
      'max-params': { cue: 'Long Parameter List', options: [{ max: 4 }] },
      'max-lines-per-function': {
        cue: 'Long Function',
        options: [{ max: 7, skipBlankLines: true, skipComments: true }],
      },
      complexity: { cue: 'the least number of tests a function needs', options: [{ max: 4 }] },
      'no-param-reassign': { cue: 'a query that also changes state', options: [{ props: true }] },
      'no-else-return': { conflict: 'Its autofix removes the symmetric if/else that shows two equal alternatives.' },
      'max-classes-per-file': { conflict: 'A role, its players and their factory belong in one module.' },
      'class-methods-use-this': { conflict: 'The signal is right, the advice to make the method static is not.' },
    },
  },
  'typescript-eslint': {
    package: '@typescript-eslint/eslint-plugin',
    namespace: '@typescript-eslint',
    optional: false,
    rules: {
      'switch-exhaustiveness-check': {
        cue: 'a switch that chooses among the members of a union',
        options: [{ considerDefaultExhaustiveForUnions: false }],
      },
      'method-signature-style': { cue: 'a role player that narrows a parameter', options: ['property'] },
      'prefer-readonly': { cue: 'state that never changes after construction' },
      'no-extraneous-class': { cue: 'Lazy Element' },
      'consistent-type-imports': { conflict: 'Its autofix can drop the side effect of a self-registering module.' },
    },
  },
  unicorn: {
    package: 'eslint-plugin-unicorn',
    namespace: 'unicorn',
    optional: true,
    rules: {
      'no-array-sort': { cue: 'a query that changes the array it reads' },
      'no-array-reverse': { cue: 'a query that changes the array it reads' },
      'no-array-splice': { cue: 'a query that changes the array it reads' },
      'prefer-switch': { conflict: 'It turns an if/else chain into a switch, the form the cures move away from.' },
      'no-static-only-class': { conflict: 'It finds the smell, then autofixes the class into a plain object.' },
    },
  },
  sonarjs: {
    package: 'eslint-plugin-sonarjs',
    namespace: 'sonarjs',
    optional: true,
    rules: {
      'cognitive-complexity': { cue: 'the least number of tests a function needs' },
      'bool-param-default': { conflict: 'It asks for a default on a flag argument instead of removing the flag.' },
    },
  },
  functional: {
    package: 'eslint-plugin-functional',
    namespace: 'functional',
    optional: true,
    rules: {
      'immutable-data': { cue: 'a query that also changes state' },
      'no-classes': { conflict: 'lz-oop designs with classes.' },
      'no-this-expressions': { conflict: 'lz-oop designs with objects that hold state.' },
      'no-class-inheritance': { conflict: 'A shallow hierarchy is one of the cures.' },
      'no-mixed-types': { conflict: 'An object with state and behaviour is the point.' },
      'no-return-void': { conflict: 'A command returns nothing by design.' },
    },
  },
} as const satisfies Record<string, RuleSource>;

type Catalog = typeof existingRules;

export type SourceId = keyof Catalog;

/** The sources that get a companion config: `plugin.configs.unicorn`, and so on. */
export type OptionalSourceId = {
  [S in SourceId]: Catalog[S]['optional'] extends true ? S : never;
}[SourceId];

type RuleIdIn<S extends SourceId, R extends string> = Catalog[S]['namespace'] extends ''
  ? R
  : `${Catalog[S]['namespace']}/${R}`;

/**
 * The ID of every cue that carries options, as a config file writes it (`max-params`,
 * `@typescript-eslint/method-signature-style`). `existing-rules.test.ts` keys its pinned cases by this type, so a
 * configured cue without RuleTester cases is a type error, and so is a pinned case for a rule the catalog dropped.
 */
export type ConfiguredRuleId = {
  [S in SourceId]: {
    [R in keyof Catalog[S]['rules'] & string]: Catalog[S]['rules'][R] extends { readonly options: readonly unknown[] }
      ? RuleIdIn<S, R>
      : never;
  }[keyof Catalog[S]['rules'] & string];
}[SourceId];

/** One catalog entry with its source, in the form every reader of the catalog iterates. */
export interface ExistingRule {
  readonly sourceId: SourceId;
  readonly source: RuleSource;
  readonly name: string;
  /** `name` with the source's namespace in front, as a config file writes it. */
  readonly id: string;
  readonly stance: Stance;
}

/** Flattens the catalog. The presets, the drift test and the README generator all start here. */
export function listExistingRules(): readonly ExistingRule[] {
  throw new Error('not implemented');
}
