import { defineSelectorRule, type SelectorRow } from '../define-selector-rule.ts';

/**
 * The selector rules that two measurements over five repositories kept, each in the sharpened form that measured
 * best. `selector-rules.test.ts` must hold cases for every name here, or type-checking fails.
 */
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
] as const satisfies readonly SelectorRow[];

export type SelectorRuleName = (typeof selectorRows)[number]['name'];

export const selectorRules = selectorRows.map((row) => defineSelectorRule(row));
