import { basename } from 'node:path';
import { Linter, type Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import * as parser from '@typescript-eslint/parser';

export interface FunctionComplexity {
  /** The name ESLint's complexity rule gives the function, such as `Method 'total'`. */
  readonly name: string;
  readonly line: number;
  readonly complexity: number;
}

export type Complexity =
  | { readonly functions: readonly FunctionComplexity[] }
  | { readonly parseError: string };

export function functionComplexity(file: string, text: string): Complexity {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ESLint 10 has no other route to a core rule's module
  const complexity = builtinRules.get('complexity');

  if (!complexity?.meta) {
    // Stryker disable next-line StringLiteral: the pinned ESLint has the rule, so nothing reaches this message
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
      throw new Error(
        // Stryker disable next-line StringLiteral: the pinned ESLint's rule reports all three, so nothing reaches this message
        "ESLint's complexity rule reported without a located function node, a name or a count.",
      );
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
      const listening: unknown = Object.create(context, {
        report: { value: count },
      });

      if (!isRuleContext(listening)) {
        throw new Error(
          // Stryker disable next-line StringLiteral: an object that inherits from the context has both keys, so nothing reaches this message
          'The listening context lost the rule context it inherits from.',
        );
      }

      return complexity.create(listening);
    },
  };

  // Linted by its base name, the file sits below ESLint's cwd and in no folder its default ignores name.
  const fatal = new Linter()
    .verify(
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
      basename(file),
    )
    .find((message) => message.fatal === true);

  return fatal
    ? {
        parseError: `${file}:${String(fatal.line)}:${String(fatal.column)} ${fatal.message}`,
      }
    : { functions };
}

function isRuleContext(value: unknown): value is Rule.RuleContext {
  // Stryker disable ConditionalExpression: `true` holds for the one value checked, which inherits from ESLint's context; `false` throws on every file, which every complexity test kills
  return (
    typeof value === 'object' &&
    value !== null &&
    'report' in value &&
    'sourceCode' in value
  );
  // Stryker restore ConditionalExpression
}
