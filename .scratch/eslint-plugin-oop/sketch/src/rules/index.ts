import type { OopRuleModule } from '../create-rule.ts';
import { typeHoppingChain } from './type-hopping-chain.ts';

// One line per rule file. `index.test.ts` fails when a rule file in this folder is missing from the list, when a
// rule's name differs from its file name, or when a rule has no `.test.ts` beside it.
const ruleModules: readonly OopRuleModule[] = [typeHoppingChain];

/**
 * The rule registry: `plugin.rules`. The key is each rule's own `name`, so a key and a name cannot disagree.
 * The presets are derived from this record (`presets.ts`); adding a rule here is all it takes to ship it in one.
 */
export const rules: Readonly<Record<string, OopRuleModule>> = Object.fromEntries(
  ruleModules.map((rule) => [rule.name, rule]),
);
