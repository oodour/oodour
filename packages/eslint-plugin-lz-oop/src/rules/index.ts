import type { OopRuleModule } from '../create-rule.ts';
import { classMethodsUseThis } from './class-methods-use-this.ts';
import { cognitiveComplexity } from './cognitive-complexity.ts';
import { complexity } from './complexity.ts';
import { maxDepth } from './max-depth.ts';
import { maxLinesPerFunction } from './max-lines-per-function.ts';
import { maxParams } from './max-params.ts';
import { maxStatements } from './max-statements.ts';
import { selectorRules } from './selector-rules.ts';
import { typeHoppingChain } from './type-hopping-chain.ts';

const ruleModules: readonly OopRuleModule[] = [
  classMethodsUseThis,
  cognitiveComplexity,
  complexity,
  maxDepth,
  maxLinesPerFunction,
  maxParams,
  maxStatements,
  typeHoppingChain,
  ...selectorRules,
];

/** The rule registry, keyed by each rule's own name. The presets are derived from it. */
export const rules: Readonly<Record<string, OopRuleModule>> = Object.fromEntries(
  ruleModules.map((rule) => [rule.name, rule]),
);
