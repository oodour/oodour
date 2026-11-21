import { type JSSyntaxElement, Linter, type Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import * as parser from '@typescript-eslint/parser';

/** A place in a source file: a line from 1 and a column from 0, as ESLint counts them. */
export interface Position {
  readonly line: number;
  readonly column: number;
}

/**
 * A function as ESLint's `complexity` rule sees it: its name and count, where it starts, and where its body starts.
 * Class field initializers and static blocks count as functions of their own, as the rule counts them.
 */
export interface FunctionSite {
  readonly name: string;
  readonly complexity: number;
  readonly start: Position;
  readonly bodyStart: Position;
}

const functionTypes = new Set(['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']);

/** Every function in the source, each with the complexity ESLint's `complexity` rule gives it. */
export function functionsIn(file: string, source: string): FunctionSite[] {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ESLint 10 has no other route to a core rule's module
  const complexity = builtinRules.get('complexity');

  if (!complexity?.meta) {
    throw new Error("ESLint's complexity rule could not be loaded.");
  }

  const sites: FunctionSite[] = [];
  const counting: Rule.RuleModule = {
    meta: complexity.meta,
    create(context) {
      // ESLint freezes the context, so an object that inherits from it shadows `report` instead.
      const listening: unknown = Object.create(context, {
        report: { value: (descriptor: Rule.ReportDescriptor) => sites.push(siteOf(descriptor)) },
      });

      if (!isRuleContext(listening)) {
        throw new Error('The listening context lost the rule context it inherits from.');
      }

      return complexity.create(listening);
    },
  };

  const [fatal] = new Linter().verify(
    source,
    [
      {
        files: ['**'],
        languageOptions: { parser },
        plugins: { metrics: { rules: { complexity: counting } } },
        rules: { 'metrics/complexity': ['error', 0] },
      },
    ],
    file,
  );

  // The counting rule reports through `sites`, never as a message, so any message is a parse failure.
  if (fatal) {
    throw new Error(`${file}:${String(fatal.line)}:${String(fatal.column)} ${fatal.message}`);
  }

  return sites;
}

function siteOf(descriptor: Rule.ReportDescriptor): FunctionSite {
  const node = 'node' in descriptor ? descriptor.node : undefined;
  const name = descriptor.data?.['name'];
  const complexity = descriptor.data?.['complexity'];

  if (!node?.loc || typeof name !== 'string' || typeof complexity !== 'number') {
    throw new Error("ESLint's complexity rule reported without a located function node, a name or a count.");
  }

  return {
    name,
    complexity,
    start: positionOf(node.loc.start),
    bodyStart: positionOf((bodyOf(node).loc ?? node.loc).start),
  };
}

/** A function's body, or the node itself for a class field initializer or static block, which is its own body. */
function bodyOf(node: JSSyntaxElement): JSSyntaxElement {
  return functionTypes.has(node.type) && 'body' in node && isSyntaxElement(node.body) ? node.body : node;
}

function isSyntaxElement(value: unknown): value is JSSyntaxElement {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

function isRuleContext(value: unknown): value is Rule.RuleContext {
  return typeof value === 'object' && value !== null && 'report' in value && 'sourceCode' in value;
}

function positionOf({ line, column }: Position): Position {
  return { line, column };
}
