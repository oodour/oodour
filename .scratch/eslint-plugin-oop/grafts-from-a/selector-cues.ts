import { defineSelectorRule, type SelectorRow } from './define-selector-rule.ts';

/**
 * The audit's selector rows (lint/core.md, "about 30 selectors", 16 of 16 fired in the spike). Wave 1 copies each
 * surviving row here, with its message in Claude's words and its recorded false positives in the rule's docs.
 * Four rows shown to fix the shape; selectors are illustrative until re-probed.
 */
const selectorRows = [
  {
    name: 'no-new-in-constructor',
    concept: 'Dependency Injection',
    description: 'Report a constructor that builds its own collaborator with new',
    selector: "MethodDefinition[kind='constructor'] NewExpression",
    message: 'This constructor builds its collaborator itself; accept it as a parameter so callers can pass another.',
    // Becomes `codemod: 'inject-collaborator'` in the wave that registers that codemod.
    why: 'every caller must then pass the collaborator, which edits other files',
  },
  {
    name: 'no-switch-on-kind',
    concept: 'Replace Conditional with Polymorphism',
    description: 'Report a switch on a kind or type tag',
    selector: "SwitchStatement > MemberExpression.discriminant > Identifier.property[name=/^(kind|type)$/]",
    message: 'This switch chooses behaviour by a type tag; each case may belong in the object the tag names.',
    why: 'moving each branch into its own class is a design choice no tool can make',
  },
  {
    name: 'no-override-that-throws',
    concept: 'Refused Bequest',
    description: 'Report an overriding method whose whole body throws',
    selector: 'MethodDefinition[override=true] > FunctionExpression > BlockStatement[body.length=1] > ThrowStatement',
    message: 'This override refuses what the parent promises; callers of the parent type will break here.',
    why: 'replacing inheritance with delegation changes callers and is decided per hierarchy',
  },
  {
    name: 'no-private-modifier',
    concept: 'Private state',
    description: 'Report the TypeScript private modifier where a #private field enforces privacy at run time',
    selector: "PropertyDefinition[accessibility='private']",
    message: 'TypeScript private is gone at run time; a #field keeps the state private there too.',
    suggest: {
      message: 'Rename to a #private field in this file.',
      fix: () => {
        // TODO: rename declaration and every this.<name> in the class body; null when the class is not one file's
        throw new Error('not implemented');
      },
    },
  },
] as const satisfies readonly SelectorRow[];

/** selector-cues.test.ts needs cases for exactly these names (checked by `satisfies Record<SelectorRuleName, ...>`). */
export type SelectorRuleName = (typeof selectorRows)[number]['name'];

export const selectorRules = selectorRows.map((row) => defineSelectorRule(row));
