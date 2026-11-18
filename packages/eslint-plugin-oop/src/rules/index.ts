import type { OopRuleModule } from '../create-rule.ts';
import { typeHoppingChain } from './type-hopping-chain.ts';

const ruleModules: readonly OopRuleModule[] = [typeHoppingChain];

/** The rule registry, keyed by each rule's own name. The presets are derived from it. */
export const rules: Readonly<Record<string, OopRuleModule>> = Object.fromEntries(
  ruleModules.map((rule) => [rule.name, rule]),
);
