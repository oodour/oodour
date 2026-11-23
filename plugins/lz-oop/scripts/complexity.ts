import { dirname, resolve } from 'node:path';
import { Linter, type Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import * as parser from '@typescript-eslint/parser';

export interface FunctionComplexity {
  /** The name ESLint's complexity rule gives the function, such as `Method 'total'`. */
  readonly name: string;
  readonly line: number;
  readonly complexity: number;
}

/**
 * The complexity of each function in a JavaScript or TypeScript file's text, in the order ESLint reports them. The
 * count is ESLint's own `complexity` rule's, run with no configuration of the audited repository.
 */
export function functionComplexity(file: string, text: string): FunctionComplexity[] {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ESLint 10 has no other route to a core rule's module
  const complexity = builtinRules.get('complexity');

  if (!complexity?.meta) {
    throw new Error("ESLint's complexity rule could not be loaded.");
  }

  const functions: FunctionComplexity[] = [];
  // A class field whose value is a function is reported for the function, then for the initializer, on one node.
  const reported = new Set<unknown>();
  const count = (descriptor: Rule.ReportDescriptor): void => {
    const node = 'node' in descriptor ? descriptor.node : undefined;
    const name = descriptor.data?.['name'];
    const paths = descriptor.data?.['complexity'];

    if (!node?.loc || typeof name !== 'string' || typeof paths !== 'number') {
      throw new Error("ESLint's complexity rule reported without a located function node, a name or a count.");
    }

    if (!reported.has(node)) {
      reported.add(node);
      functions.push({ name, line: node.loc.start.line, complexity: paths });
    }
  };
  const counting: Rule.RuleModule = {
    meta: complexity.meta,
    create(context) {
      // ESLint freezes the context, so an object that inherits from it shadows `report` instead.
      const listening: unknown = Object.create(context, { report: { value: count } });

      if (!isRuleContext(listening)) {
        throw new Error('The listening context lost the rule context it inherits from.');
      }

      return complexity.create(listening);
    },
  };

  // ESLint matches `files` against the path below its cwd, so a file outside the run's folder would match no config.
  const fatal = new Linter({ cwd: dirname(resolve(file)) }).verify(
    text,
    [
      {
        files: ['**'],
        languageOptions: { parser },
        linterOptions: { noInlineConfig: true },
        plugins: { lz: { rules: { complexity: counting } } },
        rules: { 'lz/complexity': ['error', 0] },
      },
    ],
    file,
  ).find((message) => message.fatal === true);

  if (fatal) {
    throw new Error(`${file}:${String(fatal.line)}:${String(fatal.column)} ${fatal.message}`);
  }

  return functions;
}

function isRuleContext(value: unknown): value is Rule.RuleContext {
  return typeof value === 'object' && value !== null && 'report' in value && 'sourceCode' in value;
}
