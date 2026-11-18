import { testRule } from '../testing/rule-testers.ts';
import { cognitiveComplexity } from './cognitive-complexity.ts';

const ifs = (count: number): string =>
  `function f(a) {\n${Array.from({ length: count }, (_, index) => `  if (a === ${String(index)}) { a = 0; }\n`).join('')}}`;

testRule(cognitiveComplexity, {
  valid: [ifs(4)],
  invalid: [{ code: ifs(5), errors: [{ messageId: 'found', data: { complexityAmount: 5, threshold: 4 } }] }],
});
