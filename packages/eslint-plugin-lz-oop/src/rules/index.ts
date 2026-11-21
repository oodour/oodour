import type { OopRuleModule } from '../create-rule.ts';
import { abcSize } from './abc-size.ts';
import { classMethodsUseThis } from './class-methods-use-this.ts';
import { cognitiveComplexity } from './cognitive-complexity.ts';
import { complexity } from './complexity.ts';
import { flagArgument } from './flag-argument.ts';
import { flogScore } from './flog-score.ts';
import { halsteadVolume } from './halstead-volume.ts';
import { manualDispatch } from './manual-dispatch.ts';
import { maxClassLines } from './max-class-lines.ts';
import { maxDepth } from './max-depth.ts';
import { maxLinesPerFunction } from './max-lines-per-function.ts';
import { maxParams } from './max-params.ts';
import { maxStatements } from './max-statements.ts';
import { privateAccess } from './private-access.ts';
import { repeatedSwitches } from './repeated-switches.ts';
import { selectorRules } from './selector-rules.ts';
import { typeHoppingChain } from './type-hopping-chain.ts';

const ruleModules: readonly OopRuleModule[] = [
  abcSize,
  classMethodsUseThis,
  cognitiveComplexity,
  complexity,
  flagArgument,
  flogScore,
  halsteadVolume,
  manualDispatch,
  maxClassLines,
  maxDepth,
  maxLinesPerFunction,
  maxParams,
  maxStatements,
  privateAccess,
  repeatedSwitches,
  typeHoppingChain,
  ...selectorRules,
];

/** The rule registry, keyed by each rule's own name. The presets are derived from it. */
export const rules: Readonly<Record<string, OopRuleModule>> = Object.fromEntries(
  ruleModules.map((rule) => [rule.name, rule]),
);
