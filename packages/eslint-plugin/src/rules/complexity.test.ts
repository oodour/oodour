import { testRule } from '../testing/rule-testers.ts';
import { complexity } from './complexity.ts';

const ifs = (count: number): string =>
  `function f(a) {\n${Array.from({ length: count }, (_, index) => `  if (a === ${String(index)}) { a = 0; }\n`).join('')}}`;

testRule(complexity, {
  valid: [ifs(3)],
  invalid: [{ code: ifs(4), errors: [{ messageId: 'found', data: { name: "Function 'f'", complexity: 5, max: 4 } }] }],
});
