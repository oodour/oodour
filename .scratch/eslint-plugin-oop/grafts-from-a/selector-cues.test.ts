import { runOopRuleTests, type OopRuleCases } from '../testing/rule-testers.ts';
import { selectorRules, type SelectorRuleName } from './selector-cues.ts';

/**
 * One block per selector row; typecheck fails when a row has no cases. Each block pins the selector with a hit and
 * with the nearest miss (the audit's recorded false positives become valid cases where the selector avoids them,
 * or documented misses where it cannot).
 */
const selectorCases = {
  'no-new-in-constructor': {
    valid: ['class A { constructor(b) { this.b = b; } }', 'class A { make() { return new B(); } }'],
    invalid: [{ code: 'class A { constructor() { this.b = new B(); } }', errors: [{ messageId: 'found' }] }],
  },
  'no-switch-on-kind': {
    valid: ['switch (shape.size) { default: }'],
    invalid: [{ code: 'switch (shape.kind) { default: }', errors: [{ messageId: 'found' }] }],
  },
  'no-override-that-throws': {
    valid: ['class B extends A { override f() { return 1; } }'],
    invalid: [{ code: "class B extends A { override f() { throw new Error('no'); } }", errors: [{ messageId: 'found' }] }],
  },
  'no-private-modifier': {
    valid: ['class A { #x = 1; }'],
    invalid: [
      {
        code: 'class A { private x = 1; f() { return this.x; } }',
        errors: [
          {
            messageId: 'found',
            suggestions: [{ messageId: 'suggestion', output: 'class A { #x = 1; f() { return this.#x; } }' }],
          },
        ],
      },
    ],
  },
} satisfies Record<SelectorRuleName, OopRuleCases<[], 'found' | 'suggestion'>>;

for (const rule of selectorRules) {
  // TODO: look up selectorCases by rule.name with Object.hasOwn (string at run time); a miss is a failing test.
  void rule;
  void runOopRuleTests;
  void selectorCases;
}
